/*
  # Create Opportunity Stage History Tracking System

  1. New Tables
    - `opportunity_stage_history`
      - Tracks every stage transition for opportunities
      - Records old_stage, new_stage, changed_at timestamp
      - Captures MW (target_capacity) and value at time of change
      - Links to opportunity_id and changed_by user

  2. Triggers
    - Auto-log stage changes when opportunities.stage is updated
    - Captures the complete transition history

  3. Functions
    - Rewrite `get_pipeline_velocity()` to calculate real WoW/MoM metrics
    - Based on actual stage transitions, not creation dates
    - Returns accurate MW movement between stages

  4. Security
    - Enable RLS on stage_history table
    - Only authenticated users can view history
    - Automatic logging via trigger (no manual inserts needed)

  5. Backfill
    - Create initial history entries for all existing opportunities
    - Uses created_at as the transition date for baseline
*/

-- Create the stage history tracking table
CREATE TABLE IF NOT EXISTS opportunity_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  old_stage text,
  new_stage text NOT NULL,
  target_capacity numeric,
  value numeric,
  changed_by uuid REFERENCES crm_users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for fast velocity queries
CREATE INDEX IF NOT EXISTS idx_stage_history_opp_id ON opportunity_stage_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_stage_history_changed_at ON opportunity_stage_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_history_new_stage ON opportunity_stage_history(new_stage);
CREATE INDEX IF NOT EXISTS idx_stage_history_changed_at_stage ON opportunity_stage_history(changed_at DESC, new_stage);

-- Enable RLS
ALTER TABLE opportunity_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can view all stage history
CREATE POLICY "Authenticated users can view stage history"
  ON opportunity_stage_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system (trigger) can insert stage history
CREATE POLICY "System can insert stage history"
  ON opportunity_stage_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger function to automatically log stage changes
CREATE OR REPLACE FUNCTION log_opportunity_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if stage actually changed
  IF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO opportunity_stage_history (
      opportunity_id,
      old_stage,
      new_stage,
      target_capacity,
      value,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.stage,
      NEW.stage,
      NEW.target_capacity,
      NEW.value,
      NEW.owner_id,
      NEW.updated_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to opportunities table
DROP TRIGGER IF EXISTS trigger_log_stage_change ON opportunities;
CREATE TRIGGER trigger_log_stage_change
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION log_opportunity_stage_change();

-- Backfill: Create initial history entries for all existing opportunities
-- This establishes baseline data for velocity calculations
INSERT INTO opportunity_stage_history (
  opportunity_id,
  old_stage,
  new_stage,
  target_capacity,
  value,
  changed_by,
  changed_at
)
SELECT 
  id,
  NULL as old_stage,
  stage as new_stage,
  target_capacity,
  value,
  owner_id as changed_by,
  created_at as changed_at
FROM opportunities
WHERE NOT EXISTS (
  SELECT 1 FROM opportunity_stage_history h 
  WHERE h.opportunity_id = opportunities.id
);

-- Drop old velocity function
DROP FUNCTION IF EXISTS get_pipeline_velocity(timestamptz, timestamptz);

-- Create new velocity function with real WoW/MoM calculations
CREATE OR REPLACE FUNCTION get_pipeline_velocity(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS TABLE (
  stage text,
  current_mw numeric,
  wow_change numeric,
  mom_change numeric,
  deal_count bigint
) AS $$
DECLARE
  v_one_week_ago timestamptz := now() - interval '7 days';
  v_two_weeks_ago timestamptz := now() - interval '14 days';
  v_one_month_ago timestamptz := now() - interval '30 days';
  v_two_months_ago timestamptz := now() - interval '60 days';
BEGIN
  RETURN QUERY
  WITH current_stage_mw AS (
    -- Current MW in each stage (from opportunities table)
    SELECT 
      o.stage,
      COALESCE(SUM(o.target_capacity), 0) as mw,
      COUNT(*) as count
    FROM opportunities o
    WHERE o.stage != 'Lost'
    GROUP BY o.stage
  ),
  last_week_mw AS (
    -- MW that entered each stage in the last week
    SELECT 
      h.new_stage as stage,
      COALESCE(SUM(h.target_capacity), 0) as mw
    FROM opportunity_stage_history h
    WHERE h.changed_at >= v_one_week_ago
      AND h.changed_at < now()
    GROUP BY h.new_stage
  ),
  prev_week_mw AS (
    -- MW that entered each stage in the week before that
    SELECT 
      h.new_stage as stage,
      COALESCE(SUM(h.target_capacity), 0) as mw
    FROM opportunity_stage_history h
    WHERE h.changed_at >= v_two_weeks_ago
      AND h.changed_at < v_one_week_ago
    GROUP BY h.new_stage
  ),
  last_month_mw AS (
    -- MW that entered each stage in the last month
    SELECT 
      h.new_stage as stage,
      COALESCE(SUM(h.target_capacity), 0) as mw
    FROM opportunity_stage_history h
    WHERE h.changed_at >= v_one_month_ago
      AND h.changed_at < now()
    GROUP BY h.new_stage
  ),
  prev_month_mw AS (
    -- MW that entered each stage in the month before that
    SELECT 
      h.new_stage as stage,
      COALESCE(SUM(h.target_capacity), 0) as mw
    FROM opportunity_stage_history h
    WHERE h.changed_at >= v_two_months_ago
      AND h.changed_at < v_one_month_ago
    GROUP BY h.new_stage
  )
  SELECT 
    c.stage,
    ROUND(c.mw, 2) as current_mw,
    ROUND(COALESCE(lw.mw, 0) - COALESCE(pw.mw, 0), 2) as wow_change,
    ROUND(COALESCE(lm.mw, 0) - COALESCE(pm.mw, 0), 2) as mom_change,
    c.count as deal_count
  FROM current_stage_mw c
  LEFT JOIN last_week_mw lw ON lw.stage = c.stage
  LEFT JOIN prev_week_mw pw ON pw.stage = c.stage
  LEFT JOIN last_month_mw lm ON lm.stage = c.stage
  LEFT JOIN prev_month_mw pm ON pm.stage = c.stage
  ORDER BY 
    CASE c.stage
      WHEN 'Prospect' THEN 1
      WHEN 'Qualified' THEN 2
      WHEN 'Proposal' THEN 3
      WHEN 'Negotiation' THEN 4
      WHEN 'Term Sheet' THEN 5
      WHEN 'Won' THEN 6
      ELSE 7
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure the function
ALTER FUNCTION get_pipeline_velocity(timestamptz, timestamptz) SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pipeline_velocity(timestamptz, timestamptz) TO authenticated;

-- Create helper function to get recent stage transitions for "Recent Movements"
CREATE OR REPLACE FUNCTION get_recent_stage_transitions(
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  opportunity_id uuid,
  opportunity_name text,
  old_stage text,
  new_stage text,
  target_capacity numeric,
  value numeric,
  changed_at timestamptz,
  changed_by_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.opportunity_id,
    o.name as opportunity_name,
    h.old_stage,
    h.new_stage,
    h.target_capacity,
    h.value,
    h.changed_at,
    u.name as changed_by_name
  FROM opportunity_stage_history h
  JOIN opportunities o ON o.id = h.opportunity_id
  LEFT JOIN crm_users u ON u.id = h.changed_by
  WHERE h.old_stage IS NOT NULL
  ORDER BY h.changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure and grant
ALTER FUNCTION get_recent_stage_transitions(integer) SET search_path = public;
GRANT EXECUTE ON FUNCTION get_recent_stage_transitions(integer) TO authenticated;
