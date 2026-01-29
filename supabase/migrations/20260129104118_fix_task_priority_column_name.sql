/*
  # Fix Task Master RPC - Column Name Issue

  1. Problem
    - RPC function `get_task_threads` referenced non-existent column `task_priority`
    - Actual column name is `priority`
    - Causing "column act.task_priority does not exist" error

  2. Fix
    - Replace function with corrected column name
    - Change `act.task_priority` to `act.priority`

  3. Impact
    - Fixes "Failed to load task stream" error in Task Master UI
    - No data changes, only function definition
*/

-- Drop and recreate the function with correct column name
DROP FUNCTION IF EXISTS get_task_threads(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_task_threads(p_user_id UUID, p_filter TEXT DEFAULT 'all')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Validate filter
  IF p_filter NOT IN ('all', 'mine', 'delegated') THEN
    RAISE EXCEPTION 'Invalid filter. Must be: all, mine, or delegated';
  END IF;

  -- Build unified deal stream using subqueries
  SELECT json_agg(deal_group ORDER BY deal_group->'deal'->>'stage', deal_group->'deal'->>'name')
  INTO result
  FROM (
    SELECT json_build_object(
      'deal', json_build_object(
        'id', o.id,
        'name', o.name,
        'stage', o.stage,
        'value', o.value,
        'account_name', COALESCE(a.name, 'Unknown Account')
      ),
      'progress', (
        SELECT CASE
          WHEN COUNT(*) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE task_status = 'Completed')::numeric / COUNT(*)::numeric) * 100)
          ELSE 0
        END
        FROM activities
        WHERE root_deal_id = o.id
          AND is_task = true
          AND (
            p_filter = 'all'
            OR (p_filter = 'mine' AND assigned_to_id = p_user_id)
            OR (p_filter = 'delegated' AND created_by = p_user_id AND assigned_to_id != p_user_id)
          )
      ),
      'total_tasks', (
        SELECT COUNT(*)
        FROM activities
        WHERE root_deal_id = o.id
          AND is_task = true
          AND (
            p_filter = 'all'
            OR (p_filter = 'mine' AND assigned_to_id = p_user_id)
            OR (p_filter = 'delegated' AND created_by = p_user_id AND assigned_to_id != p_user_id)
          )
      ),
      'completed_tasks', (
        SELECT COUNT(*)
        FROM activities
        WHERE root_deal_id = o.id
          AND is_task = true
          AND task_status = 'Completed'
          AND (
            p_filter = 'all'
            OR (p_filter = 'mine' AND assigned_to_id = p_user_id)
            OR (p_filter = 'delegated' AND created_by = p_user_id AND assigned_to_id != p_user_id)
          )
      ),
      'tasks', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', act.id,
            'summary', act.summary,
            'details', act.details,
            'status', act.task_status,
            'priority', act.priority,
            'dueDate', act.due_date,
            'assignedToId', act.assigned_to_id,
            'assigneeName', u.name,
            'assigneeAvatar', u.avatar,
            'parentTaskId', act.parent_task_id,
            'depth', act.thread_depth,
            'createdAt', act.created_at
          )
          ORDER BY act.due_date ASC NULLS LAST, act.created_at DESC
        ), '[]'::json)
        FROM activities act
        LEFT JOIN crm_users u ON u.id = act.assigned_to_id
        WHERE act.root_deal_id = o.id
          AND act.is_task = true
          AND (
            p_filter = 'all'
            OR (p_filter = 'mine' AND act.assigned_to_id = p_user_id)
            OR (p_filter = 'delegated' AND act.created_by = p_user_id AND act.assigned_to_id != p_user_id)
          )
      )
    ) as deal_group
    FROM opportunities o
    LEFT JOIN accounts a ON a.id = o.account_id
    WHERE o.stage NOT IN ('Lost', 'Dead')
      AND EXISTS (
        SELECT 1
        FROM activities act
        WHERE act.root_deal_id = o.id
          AND act.is_task = true
          AND (
            p_filter = 'all'
            OR (p_filter = 'mine' AND act.assigned_to_id = p_user_id)
            OR (p_filter = 'delegated' AND act.created_by = p_user_id AND act.assigned_to_id != p_user_id)
          )
      )
  ) deal_groups;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
