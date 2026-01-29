/*
  # Task Threading & Deal Grouping System

  1. Schema Changes
    - Add `parent_task_id` to activities for nested tasks (max 3 levels deep)
    - Add `thread_depth` to track nesting level automatically
    - Add `root_deal_id` for optimization (pre-compute the root opportunity)

  2. Automation
    - Trigger: Auto-calculate thread depth when creating child tasks
    - Constraint: Limit nesting to 3 levels maximum

  3. Security
    - RLS policies remain unchanged (inherit from activities table)
*/

-- 1. Add Threading Columns
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES activities(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS thread_depth INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS root_deal_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;

-- Add constraint to limit nesting depth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activities_thread_depth_check'
  ) THEN
    ALTER TABLE activities ADD CONSTRAINT activities_thread_depth_check CHECK (thread_depth <= 3);
  END IF;
END $$;

-- 2. Create Trigger Function for Auto-Depth Calculation
CREATE OR REPLACE FUNCTION calc_thread_depth() 
RETURNS TRIGGER AS $$
BEGIN
  -- If this task has a parent, calculate depth from parent
  IF NEW.parent_task_id IS NOT NULL THEN
    SELECT thread_depth + 1, COALESCE(root_deal_id, related_to_id)
    INTO NEW.thread_depth, NEW.root_deal_id
    FROM activities 
    WHERE id = NEW.parent_task_id;
  ELSE
    -- Root level task - set depth to 1 and detect root deal
    NEW.thread_depth := 1;
    IF NEW.related_to_type = 'Opportunity' THEN
      NEW.root_deal_id := NEW.related_to_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS on_task_nest ON activities;
CREATE TRIGGER on_task_nest 
BEFORE INSERT OR UPDATE OF parent_task_id 
ON activities 
FOR EACH ROW 
EXECUTE FUNCTION calc_thread_depth();

-- 4. Backfill root_deal_id for existing tasks
UPDATE activities
SET root_deal_id = related_to_id
WHERE is_task = true 
  AND related_to_type = 'Opportunity' 
  AND root_deal_id IS NULL;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_activities_parent_task ON activities(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_root_deal ON activities(root_deal_id) WHERE root_deal_id IS NOT NULL;