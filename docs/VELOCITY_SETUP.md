# Velocity Dashboard Setup Guide

This document explains how to set up the real-time velocity tracking feature for the CRM dashboard.

## Overview

The Velocity Dashboard shows **Week-over-Week (WoW)** and **Month-over-Month (MoM)** changes in your pipeline. To calculate these changes accurately, we need to store historical snapshots of your pipeline data.

## Current Status

The VelocityDashboard component has two modes:
1. **Real-time mode**: Uses actual historical data from `pipeline_snapshots` table
2. **Fallback mode**: Estimates velocity based on `updatedAt` timestamps (less accurate)

You'll see an indicator at the top of the dashboard showing which mode is active.

## Database Setup

Run the following SQL in your Supabase SQL Editor to enable real-time velocity tracking:

### Step 1: Create the Pipeline Snapshots Table

```sql
-- ==========================================
-- 1. TABLE: PIPELINE SNAPSHOTS
-- Stores daily totals to calculate trends (WoW, MoM)
-- ==========================================
CREATE TABLE public.pipeline_snapshots (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT current_date,
  stage text NOT NULL,
  total_value numeric DEFAULT 0,
  total_count int DEFAULT 0,
  total_capacity numeric DEFAULT 0, -- MW
  created_at timestamptz DEFAULT now()
);

-- Unique constraint to prevent duplicate snapshots for same day/stage
CREATE UNIQUE INDEX idx_snapshot_day_stage ON public.pipeline_snapshots(snapshot_date, stage);

-- Enable RLS (Read-only for users, Insert for System)
ALTER TABLE public.pipeline_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view snapshots" ON public.pipeline_snapshots 
  FOR SELECT USING (true);

CREATE POLICY "System inserts snapshots" ON public.pipeline_snapshots 
  FOR INSERT WITH CHECK (true);
```

### Step 2: Create the Snapshot Capture Function

This function should be run daily (via cron job or Edge Function):

```sql
-- ==========================================
-- 2. FUNCTION: CAPTURE SNAPSHOT
-- This should be run nightly via a Cron Job or Edge Function
-- ==========================================
CREATE OR REPLACE FUNCTION public.capture_pipeline_snapshot()
RETURNS void AS $$
BEGIN
  INSERT INTO public.pipeline_snapshots (snapshot_date, stage, total_value, total_count, total_capacity)
  SELECT 
    current_date,
    stage,
    COALESCE(SUM(value), 0),
    COUNT(*),
    COALESCE(SUM(target_capacity), 0)
  FROM public.opportunities
  WHERE stage != 'Lost'
  GROUP BY stage
  ON CONFLICT (snapshot_date, stage) 
  DO UPDATE SET 
    total_value = EXCLUDED.total_value,
    total_count = EXCLUDED.total_count,
    total_capacity = EXCLUDED.total_capacity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Create the Velocity Metrics Function

This function calculates the WoW and MoM changes:

```sql
-- ==========================================
-- 3. FUNCTION: GET VELOCITY METRICS
-- Calculates Current vs Last Week vs Last Month
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_pipeline_velocity()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    WITH current_data AS (
      SELECT stage, SUM(target_capacity) AS mw 
      FROM public.opportunities 
      WHERE stage != 'Lost' 
      GROUP BY stage
    ),
    last_week AS (
      SELECT stage, total_capacity AS mw 
      FROM public.pipeline_snapshots 
      WHERE snapshot_date = current_date - 7
    ),
    last_month AS (
      SELECT stage, total_capacity AS mw 
      FROM public.pipeline_snapshots 
      WHERE snapshot_date = current_date - 30
    )
    SELECT 
      c.stage,
      COALESCE(c.mw, 0) AS current_mw,
      COALESCE(c.mw, 0) - COALESCE(w.mw, 0) AS wow_change,
      COALESCE(c.mw, 0) - COALESCE(m.mw, 0) AS mom_change
    FROM current_data c
    LEFT JOIN last_week w ON c.stage = w.stage
    LEFT JOIN last_month m ON c.stage = m.stage
  ) t;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Setting Up Daily Snapshots

### Option A: Using Supabase Cron (pg_cron extension)

If you have pg_cron enabled:

```sql
-- Run snapshot capture every day at midnight UTC
SELECT cron.schedule(
  'daily-pipeline-snapshot',
  '0 0 * * *',
  $$SELECT public.capture_pipeline_snapshot()$$
);
```

### Option B: Using Supabase Edge Function

Create an Edge Function that calls the snapshot function:

```typescript
// supabase/functions/capture-snapshot/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase.rpc('capture_pipeline_snapshot')
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

Then set up a cron job to call this Edge Function daily.

### Option C: Manual Capture

You can also manually capture snapshots by running:

```sql
SELECT public.capture_pipeline_snapshot();
```

## Seeding Historical Data

To get meaningful velocity data immediately, you can seed some historical snapshots:

```sql
-- Seed last 7 days of data (adjust values as needed)
INSERT INTO public.pipeline_snapshots (snapshot_date, stage, total_value, total_count, total_capacity)
VALUES 
  -- 7 days ago
  (current_date - 7, 'Prospect', 500000, 5, 10.5),
  (current_date - 7, 'Qualified', 750000, 3, 8.0),
  (current_date - 7, 'Proposal', 1200000, 4, 15.0),
  (current_date - 7, 'Negotiation', 800000, 2, 6.5),
  (current_date - 7, 'Won', 2000000, 3, 12.0),
  -- 30 days ago
  (current_date - 30, 'Prospect', 400000, 4, 8.0),
  (current_date - 30, 'Qualified', 600000, 2, 6.0),
  (current_date - 30, 'Proposal', 900000, 3, 10.0),
  (current_date - 30, 'Negotiation', 500000, 1, 4.0),
  (current_date - 30, 'Won', 1500000, 2, 8.0);
```

## Verification

After running the SQL setup, refresh your dashboard. You should see:
- A green indicator saying "Using real-time velocity data"
- Velocity change indicators (+/-) on each pipeline stage
- Accurate WoW and MoM comparisons

## Troubleshooting

### Dashboard shows "Using calculated estimates"
- Ensure the `pipeline_snapshots` table exists
- Ensure the `get_pipeline_velocity()` function exists
- Check that you have historical data (at least 7 days old for WoW)

### No velocity changes showing
- Run `capture_pipeline_snapshot()` to create today's snapshot
- Seed historical data for comparison
- Wait 7 days for natural WoW data to accumulate

### Permission errors
- Ensure RLS policies are set up correctly
- Check that the functions are created with `SECURITY DEFINER`
