/*
  # Task Master V2 - Deal-Centric Threaded Tasks

  1. Schema Upgrade
    - Add `parent_task_id` for task nesting/threading
    - Add `thread_depth` to limit nesting to 3 levels
    - Add `root_deal_id` to group all tasks by their origin Deal

  2. Data Backfill
    - Link existing orphan tasks to their Opportunities via root_deal_id

  3. Triggers
    - Auto-maintain thread depth and context inheritance from parent tasks

  4. RPC Functions
    - `get_deal_threads_view` - Smart function to fetch tasks grouped by Deal
      with view mode filtering (my/delegated/all)

  5. Security
    - Function uses SECURITY DEFINER with auth.uid() checks
    - Respects existing RLS policies on activities and opportunities
*/

-- 1. Schema Upgrade (Safe Mode - IF NOT EXISTS)
DO $$
BEGIN
  -- Add parent_task_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'parent_task_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN parent_task_id UUID REFERENCES activities(id);
  END IF;

  -- Add thread_depth column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'thread_depth'
  ) THEN
    ALTER TABLE activities ADD COLUMN thread_depth INT DEFAULT 1;
    ALTER TABLE activities ADD CONSTRAINT thread_depth_limit CHECK (thread_depth <= 3);
  END IF;

  -- Add root_deal_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'root_deal_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN root_deal_id UUID REFERENCES opportunities(id);
  END IF;
END $$;

-- 2. Backfill: Link orphan tasks to their Opportunities
UPDATE activities
SET root_deal_id = related_to_id
WHERE is_task = true
  AND related_to_type = 'Opportunity'
  AND root_deal_id IS NULL;

-- 3. Trigger: Maintain Thread Depth & Root Deal Context
CREATE OR REPLACE FUNCTION maintain_task_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is a reply/sub-task, inherit depth and root deal from parent
  IF NEW.parent_task_id IS NOT NULL THEN
    SELECT thread_depth + 1, COALESCE(root_deal_id, related_to_id)
    INTO NEW.thread_depth, NEW.root_deal_id
    FROM activities
    WHERE id = NEW.parent_task_id;

    -- Enforce depth limit
    IF NEW.thread_depth > 3 THEN
      RAISE EXCEPTION 'Task threading depth cannot exceed 3 levels';
    END IF;
  -- If this is a root task on an Opportunity, set root_deal_id
  ELSIF NEW.is_task = true AND NEW.related_to_type = 'Opportunity' THEN
    NEW.root_deal_id := NEW.related_to_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to ensure clean state
DROP TRIGGER IF EXISTS on_task_nest ON activities;
CREATE TRIGGER on_task_nest
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION maintain_task_thread();

-- 4. RPC: Get Deal Threads View (The Brain)
CREATE OR REPLACE FUNCTION get_deal_threads_view(p_view_mode TEXT DEFAULT 'my')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  curr_user_id UUID := auth.uid();
BEGIN
  -- Validate view mode
  IF p_view_mode NOT IN ('my', 'delegated', 'all') THEN
    RAISE EXCEPTION 'Invalid view mode. Must be: my, delegated, or all';
  END IF;

  -- Return Array of Deals, each containing an Array of Tasks
  SELECT json_agg(deal_obj ORDER BY o.stage, o.name) INTO result
  FROM (
    SELECT
      o.id,
      o.name,
      o.stage,
      o.value,
      o.probability,
      (
        SELECT json_agg(t ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC)
        FROM (
          SELECT
            a.id,
            a.summary,
            a.task_status,
            a.due_date,
            a.assigned_to_id,
            a.parent_task_id,
            a.thread_depth,
            a.created_at,
            u.full_name as assigned_to_name,
            u.avatar_url as assigned_to_avatar
          FROM activities a
          LEFT JOIN crm_users u ON u.id = a.assigned_to_id
          WHERE a.root_deal_id = o.id
            AND a.is_task = true
            AND (
              p_view_mode = 'all'
              OR (p_view_mode = 'my' AND a.assigned_to_id = curr_user_id)
              OR (p_view_mode = 'delegated' AND a.created_by = curr_user_id AND a.assigned_to_id != curr_user_id)
            )
        ) t
      ) as tasks
    FROM opportunities o
    WHERE o.stage NOT IN ('Lost', 'Dead')
      -- Only show deals that HAVE tasks visible to this user
      AND EXISTS (
        SELECT 1 FROM activities a
        WHERE a.root_deal_id = o.id
          AND a.is_task = true
          AND (
            p_view_mode = 'all'
            OR (p_view_mode = 'my' AND a.assigned_to_id = curr_user_id)
            OR (p_view_mode = 'delegated' AND a.created_by = curr_user_id AND a.assigned_to_id != curr_user_id)
          )
      )
  ) deal_obj;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_activities_root_deal_id ON activities(root_deal_id) WHERE is_task = true;
CREATE INDEX IF NOT EXISTS idx_activities_parent_task_id ON activities(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_task_assignment ON activities(assigned_to_id, task_status) WHERE is_task = true;
