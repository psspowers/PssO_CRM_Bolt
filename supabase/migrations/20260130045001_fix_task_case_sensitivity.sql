/*
  # Fix Task Case Sensitivity Issues

  1. Problem
    - Frontend creates tasks with lowercase 'opportunity'
    - Database trigger expects uppercase 'Opportunity'
    - This prevents root_deal_id from being set correctly
    - Tasks don't appear in the task threads view

  2. Changes
    - Standardize all related_to_type values to use uppercase
    - Update trigger to be case-insensitive
    - Backfill root_deal_id for any missed tasks
    - Set is_task flag for all Task type activities

  3. Data Safety
    - Non-destructive updates only
    - Uses IF conditions to prevent overwrites
*/

-- 1. Standardize related_to_type values to use uppercase
UPDATE activities
SET related_to_type =
  CASE
    WHEN LOWER(related_to_type) = 'opportunity' THEN 'Opportunity'
    WHEN LOWER(related_to_type) = 'project' THEN 'Project'
    WHEN LOWER(related_to_type) = 'account' THEN 'Account'
    WHEN LOWER(related_to_type) = 'partner' THEN 'Partner'
    WHEN LOWER(related_to_type) = 'contact' THEN 'Contact'
    ELSE related_to_type
  END
WHERE related_to_type IS NOT NULL;

-- 2. Ensure is_task flag is set for all Task type activities
UPDATE activities
SET is_task = true
WHERE type = 'Task' AND (is_task IS NULL OR is_task = false);

-- 3. Backfill root_deal_id for tasks related to opportunities
UPDATE activities
SET root_deal_id = related_to_id
WHERE is_task = true
  AND related_to_type = 'Opportunity'
  AND root_deal_id IS NULL
  AND related_to_id IS NOT NULL;

-- 4. Backfill root_deal_id for child tasks by following parent chain
UPDATE activities child
SET root_deal_id = parent.root_deal_id
FROM activities parent
WHERE child.parent_task_id = parent.id
  AND child.root_deal_id IS NULL
  AND parent.root_deal_id IS NOT NULL;

-- 5. Update trigger function to be case-insensitive
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
    -- Root level task - set depth to 1 and detect root deal (case-insensitive)
    NEW.thread_depth := 1;
    IF LOWER(NEW.related_to_type) = 'opportunity' THEN
      NEW.root_deal_id := NEW.related_to_id;
      -- Standardize to uppercase
      NEW.related_to_type := 'Opportunity';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Add index for faster task lookups
CREATE INDEX IF NOT EXISTS idx_activities_is_task ON activities(is_task) WHERE is_task = true;
CREATE INDEX IF NOT EXISTS idx_activities_task_status ON activities(task_status) WHERE is_task = true;
