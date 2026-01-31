/*
  # Fix Task Duplication Issue

  1. Problem
    - Subtasks were being duplicated in the UI because they had `related_to_type = 'Opportunity'`
    - This caused the recursive query to pick them up twice:
      - Once as a root task (matching related_to_type = 'Opportunity')
      - Once as a child task (matching parent_task_id)

  2. Solution
    - Add a check constraint to enforce: if parent_task_id IS NOT NULL, then related_to_type MUST be 'Activity'
    - This prevents future subtasks from being created with incorrect metadata

  3. Data Fix
    - All existing subtasks have been corrected via UPDATE query
*/

-- Add constraint to prevent subtasks from having related_to_type = 'Opportunity'
ALTER TABLE activities
ADD CONSTRAINT check_subtask_related_type
CHECK (
  (parent_task_id IS NULL AND related_to_type IN ('Opportunity', 'Contact', 'Account'))
  OR
  (parent_task_id IS NOT NULL AND related_to_type = 'Activity')
);
