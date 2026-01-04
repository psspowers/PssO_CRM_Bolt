/*
  # Operation Black Box - Install Stage History Engine

  1. Cleanup
    - Drop fake `get_pipeline_velocity` function
  
  2. New Tables
    - `opportunity_stage_history`
      - `id` (uuid, primary key)
      - `opportunity_id` (uuid, references opportunities)
      - `user_id` (uuid, references crm_users)
      - `old_stage` (text, nullable for new inserts)
      - `new_stage` (text)
      - `mw_volume` (numeric, snapshot at move)
      - `created_at` (timestamptz)
  
  3. Security
    - Enable RLS on `opportunity_stage_history`
    - Policy: Users can view history based on Iron Dome hierarchy
      - Admins see all
      - Owners see their own
      - Managers see subordinates'
  
  4. Automation
    - Trigger `log_stage_change()` fires on INSERT/UPDATE of opportunities
    - Logs stage transitions with MW snapshot
    - Excludes duplicate entries (no change = no log)
  
  5. Analytics
    - Function `get_mw_hustle()` - Returns sum of MW that moved stages in period
    - Excludes initial creation (old_stage IS NULL)
    - Optional user filter for individual performance tracking
*/

-- 1. CLEANUP: Drop the old "Cardboard" engine
DROP FUNCTION IF EXISTS get_pipeline_velocity;

-- 2. TABLE: Create the History Recorder
CREATE TABLE IF NOT EXISTS opportunity_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES crm_users(id), -- Linked to Public Profile
  old_stage text,
  new_stage text,
  mw_volume numeric, -- Snapshot of MW at the moment of move
  created_at timestamptz DEFAULT now()
);

-- 3. SECURITY: Iron Dome RLS
ALTER TABLE opportunity_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View history hierarchy" ON opportunity_stage_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_stage_history.opportunity_id
      AND (
        is_admin() 
        OR o.owner_id = auth.uid() 
        OR o.owner_id IN (
          SELECT subordinate_id FROM user_hierarchy WHERE manager_id = auth.uid()
        )
      )
    )
  );

-- 4. AUTOMATION: The Trigger
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log if stage changed OR if it's a new insert
  IF (TG_OP = 'INSERT') OR (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO opportunity_stage_history (
      opportunity_id,
      user_id,
      old_stage,
      new_stage,
      mw_volume
    ) VALUES (
      NEW.id,
      auth.uid(), 
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.stage END,
      NEW.stage,
      COALESCE(NEW.target_capacity, 0)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_opportunity_stage_change ON opportunities;
CREATE TRIGGER on_opportunity_stage_change
  AFTER INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION log_stage_change();

-- 5. ANALYTICS: The "MW Hustle" Calculator
-- Returns the Sum of MW that moved stages in the period (excluding initial creation)
CREATE OR REPLACE FUNCTION get_mw_hustle(
  start_date timestamptz,
  end_date timestamptz,
  user_id_filter uuid DEFAULT NULL 
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_moved numeric;
BEGIN
  SELECT COALESCE(SUM(mw_volume), 0)
  INTO total_moved
  FROM opportunity_stage_history h
  LEFT JOIN opportunities o ON h.opportunity_id = o.id
  WHERE h.created_at >= start_date 
  AND h.created_at <= end_date
  AND h.old_stage IS NOT NULL -- Exclude "New Projects" (Feed), count only "Moves" (Hustle)
  AND (user_id_filter IS NULL OR o.owner_id = user_id_filter);
  
  RETURN total_moved;
END;
$$;