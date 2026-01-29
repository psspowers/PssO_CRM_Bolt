/*
  # Fix Task Master RPC Function

  1. Changes
    - Remove non-existent `probability` column reference from get_deal_threads_view
    - Function now only returns essential fields that exist in the schema
*/

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
