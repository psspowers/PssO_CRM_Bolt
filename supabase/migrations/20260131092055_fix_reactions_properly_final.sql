/*
  # Fix Reactions Counter Properly - Final

  1. Changes
    - Replace jsonb_array_length with proper object key counting
    - reactions is a JSONB object like: {"user-uuid-1": "like", "user-uuid-2": "like"}
    - Count the number of keys in the object to get like count
    - Handle null reactions properly
    - Fix comment counting to work for nested threads (X-style)

  2. Security
    - Maintain SECURITY DEFINER with search_path = public
*/

CREATE OR REPLACE FUNCTION get_deal_threads_view(p_view_mode TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
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
      COALESCE(o.velocity_score, 0) as velocity_score,
      (
        SELECT json_agg(t) FROM (
          WITH RECURSIVE task_tree AS (
            -- Root level: tasks and comments directly linked to opportunity
            SELECT
              a.id,
              a.summary,
              a.is_task,
              a.task_status,
              a.due_date,
              a.assigned_to_id,
              a.parent_task_id,
              a.thread_depth,
              a.from_pulse,
              a.created_at,
              a.reactions,
              a.priority,
              u.avatar as assignee_avatar,
              u.name as assignee_name,
              u.role as assignee_role
            FROM activities a
            LEFT JOIN crm_users u ON a.assigned_to_id = u.id
            WHERE a.related_to_id = o.id
              AND a.related_to_type = 'Opportunity'
              AND a.parent_task_id IS NULL

            UNION ALL

            -- Child level: tasks and comments linked via parent_task_id (recursive)
            SELECT
              a.id,
              a.summary,
              a.is_task,
              a.task_status,
              a.due_date,
              a.assigned_to_id,
              a.parent_task_id,
              a.thread_depth,
              a.from_pulse,
              a.created_at,
              a.reactions,
              a.priority,
              u.avatar as assignee_avatar,
              u.name as assignee_name,
              u.role as assignee_role
            FROM activities a
            LEFT JOIN crm_users u ON a.assigned_to_id = u.id
            INNER JOIN task_tree tt ON a.parent_task_id = tt.id
          )
          SELECT 
            id,
            summary,
            is_task,
            task_status,
            due_date,
            assigned_to_id,
            parent_task_id,
            thread_depth,
            from_pulse,
            created_at,
            reactions,
            priority,
            assignee_avatar,
            assignee_name,
            assignee_role,
            -- Count DIRECT children that are comments (X-style threading)
            (
              SELECT COUNT(*)::integer 
              FROM activities 
              WHERE parent_task_id = task_tree.id AND is_task = false
            ) as comment_count,
            -- Count reactions by counting keys in the JSONB object
            (
              SELECT COUNT(*)::integer
              FROM jsonb_object_keys(COALESCE(task_tree.reactions, '{}'::jsonb))
            ) as like_count
          FROM task_tree
          WHERE (
            p_view_mode = 'all'
            OR (p_view_mode = 'mine' AND (assigned_to_id = curr_user_id OR is_task = false))
            OR (p_view_mode = 'delegated' AND assigned_to_id != curr_user_id)
          )
          ORDER BY 
            CASE WHEN is_task THEN 0 ELSE 1 END,
            due_date ASC NULLS LAST, 
            created_at ASC
        ) t
      ) as tasks
    FROM opportunities o
    WHERE o.stage NOT IN ('Lost')
    ORDER BY o.velocity_score DESC, o.updated_at DESC
  ) deal_obj;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
