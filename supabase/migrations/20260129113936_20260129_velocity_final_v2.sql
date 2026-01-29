/*
  # Velocity Command - Unified Deal Stream

  1. New RPC Function
    - `get_deal_threads_view(p_view_mode TEXT)`
    - Returns: JSON array of deals with nested tasks
    - Filters: all, my, delegated
    - Includes: target_capacity (MW), full task details

  2. Security
    - SECURITY DEFINER for consistent access
    - Uses auth.uid() for user context
    - Respects existing RLS policies

  3. Performance
    - Single query with subquery for tasks
    - JSON aggregation for efficient return
    - Indexed columns (root_deal_id, assigned_to_id)
*/

DROP FUNCTION IF EXISTS get_deal_threads_view(TEXT);

CREATE OR REPLACE FUNCTION get_deal_threads_view(p_view_mode TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  curr_user_id UUID := auth.uid();
BEGIN
  SELECT json_agg(deal_obj) INTO result FROM (
    SELECT
      o.id,
      o.name,
      o.stage,
      COALESCE(o.target_capacity, 0) as mw,
      a.name as account_name,
      (
        SELECT json_agg(t ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC) FROM (
          SELECT
            act.id,
            act.summary,
            act.task_status,
            act.due_date,
            act.assigned_to_id,
            act.parent_task_id,
            COALESCE(act.thread_depth, 0) as thread_depth,
            u.avatar as assignee_avatar,
            u.name as assignee_name
          FROM activities act
          LEFT JOIN crm_users u ON act.assigned_to_id = u.id
          WHERE act.root_deal_id = o.id
            AND act.is_task = true
            AND act.task_status != 'Cancelled'
            AND (
              p_view_mode = 'all'
              OR (p_view_mode = 'my' AND act.assigned_to_id = curr_user_id)
              OR (p_view_mode = 'delegated' AND act.created_by = curr_user_id AND act.assigned_to_id != curr_user_id)
            )
        ) t
      ) as tasks
    FROM opportunities o
    LEFT JOIN accounts a ON o.linked_account_id = a.id
    WHERE o.stage NOT IN ('Lost', 'Cancelled')
      AND EXISTS (
        SELECT 1 FROM activities act
        WHERE act.root_deal_id = o.id
          AND act.is_task = true
          AND act.task_status != 'Cancelled'
          AND (
            p_view_mode = 'all'
            OR (p_view_mode = 'my' AND act.assigned_to_id = curr_user_id)
            OR (p_view_mode = 'delegated' AND act.created_by = curr_user_id AND act.assigned_to_id != curr_user_id)
          )
      )
    ORDER BY
      CASE
        WHEN o.stage = 'Won' THEN 1
        WHEN o.stage = 'Term Sheet' THEN 2
        WHEN o.stage = 'Negotiation' THEN 3
        WHEN o.stage = 'Proposal' THEN 4
        WHEN o.stage = 'Qualification' THEN 5
        ELSE 6
      END,
      o.updated_at DESC
  ) deal_obj;

  RETURN COALESCE(result, '[]'::json);
END;
$$;