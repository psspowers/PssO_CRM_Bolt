/*
  # Fix Stage History Schema - Force Reset

  1. Cleanup
    - Drop trigger, function, and table completely to force reset
  
  2. Recreate Table
    - `opportunity_stage_history` with ALL required columns including `user_id`
      - `id` (uuid, primary key)
      - `opportunity_id` (uuid, references opportunities)
      - `user_id` (uuid, references crm_users) - THE MISSING COLUMN
      - `old_stage` (text, nullable)
      - `new_stage` (text)
      - `mw_volume` (numeric)
      - `created_at` (timestamptz)
  
  3. Security
    - Enable RLS
    - Policy: View history based on Iron Dome hierarchy (explicit role check)
  
  4. Automation
    - Recreate `log_stage_change()` function with proper user_id linking
    - Reattach trigger to opportunities table
  
  5. Analytics
    - Verify `get_mw_hustle()` function compatibility
*/

-- 1. DROP EVERYTHING related to the history engine to ensure a clean slate
DROP TRIGGER IF EXISTS on_opportunity_stage_change ON opportunities;
DROP FUNCTION IF EXISTS log_stage_change();
DROP TABLE IF EXISTS opportunity_stage_history CASCADE;

-- 2. RE-CREATE THE TABLE (With the correct columns)
CREATE TABLE opportunity_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES crm_users(id), -- The missing column!
  old_stage text,
  new_stage text,
  mw_volume numeric,
  created_at timestamptz DEFAULT now()
);

-- 3. RE-ENABLE SECURITY
ALTER TABLE opportunity_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View history hierarchy" ON opportunity_stage_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_stage_history.opportunity_id
      AND (
        -- Standard Iron Dome Logic
        (SELECT role FROM crm_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
        OR o.owner_id = auth.uid()
        OR o.owner_id IN (
          SELECT subordinate_id FROM user_hierarchy WHERE manager_id = auth.uid()
        )
      )
    )
  );

-- 4. RE-CREATE THE TRIGGER FUNCTION
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
      -- Linking to crm_users via auth.uid()
      (SELECT id FROM crm_users WHERE id = auth.uid()), 
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.stage END,
      NEW.stage,
      COALESCE(NEW.target_capacity, 0)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RE-ATTACH THE TRIGGER
CREATE TRIGGER on_opportunity_stage_change
  AFTER INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION log_stage_change();

-- 6. VERIFY HELPER FUNCTION (Ensure it still works)
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
  AND h.old_stage IS NOT NULL 
  AND (user_id_filter IS NULL OR o.owner_id = user_id_filter);
  
  RETURN total_moved;
END;
$$;