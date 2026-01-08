/*
  # Restore get_pipeline_velocity Function
  
  This migration restores the `get_pipeline_velocity` function that was dropped
  in a previous migration. The Velocity Dashboard UI still depends on this function.
  
  ## Function Purpose
  - Returns stage-level velocity metrics (current MW, week-over-week change, month-over-month change)
  - Used by the Velocity Dashboard to show pipeline movement
  
  ## Returns
  - stage (text): The opportunity stage name
  - current_mw (numeric): Current total MW in this stage
  - wow_change (numeric): Percentage change week-over-week
  - mom_change (numeric): Percentage change month-over-month
  
  ## Security
  - SECURITY DEFINER with restricted search_path
  - Grants to authenticated users only
*/

CREATE OR REPLACE FUNCTION get_pipeline_velocity()
RETURNS TABLE (
  stage text,
  current_mw numeric,
  wow_change numeric,
  mom_change numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_one_week_ago timestamptz;
  v_one_month_ago timestamptz;
BEGIN
  v_one_week_ago := now() - interval '7 days';
  v_one_month_ago := now() - interval '30 days';
  
  RETURN QUERY
  WITH current_stage_mw AS (
    SELECT 
      o.stage,
      COALESCE(SUM(o.target_capacity), 0) as mw
    FROM opportunities o
    WHERE o.stage IS NOT NULL
    GROUP BY o.stage
  ),
  one_week_ago_mw AS (
    SELECT 
      osh.new_stage as stage,
      COALESCE(SUM(osh.mw_volume), 0) as mw
    FROM opportunity_stage_history osh
    WHERE osh.created_at <= v_one_week_ago
      AND osh.new_stage IS NOT NULL
      AND osh.opportunity_id IN (
        SELECT id FROM opportunities WHERE created_at <= v_one_week_ago
      )
    GROUP BY osh.new_stage
  ),
  one_month_ago_mw AS (
    SELECT 
      osh.new_stage as stage,
      COALESCE(SUM(osh.mw_volume), 0) as mw
    FROM opportunity_stage_history osh
    WHERE osh.created_at <= v_one_month_ago
      AND osh.new_stage IS NOT NULL
      AND osh.opportunity_id IN (
        SELECT id FROM opportunities WHERE created_at <= v_one_month_ago
      )
    GROUP BY osh.new_stage
  )
  SELECT 
    c.stage,
    c.mw as current_mw,
    CASE 
      WHEN COALESCE(w.mw, 0) = 0 THEN 0
      ELSE ((c.mw - COALESCE(w.mw, 0)) / COALESCE(w.mw, 1)) * 100
    END as wow_change,
    CASE 
      WHEN COALESCE(m.mw, 0) = 0 THEN 0
      ELSE ((c.mw - COALESCE(m.mw, 0)) / COALESCE(m.mw, 1)) * 100
    END as mom_change
  FROM current_stage_mw c
  LEFT JOIN one_week_ago_mw w ON c.stage = w.stage
  LEFT JOIN one_month_ago_mw m ON c.stage = m.stage
  ORDER BY 
    CASE c.stage
      WHEN 'Prospect' THEN 1
      WHEN 'Qualified' THEN 2
      WHEN 'Proposal' THEN 3
      WHEN 'Negotiation' THEN 4
      WHEN 'Term Sheet' THEN 5
      WHEN 'Won' THEN 6
      WHEN 'Lost' THEN 7
      ELSE 8
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pipeline_velocity() TO authenticated;
