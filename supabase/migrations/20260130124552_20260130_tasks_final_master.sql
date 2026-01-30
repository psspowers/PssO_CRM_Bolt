/*
  # Tasks Final Master Migration

  1. Schema Updates
    - Adds velocity_score column to opportunities table if not exists
    - Adds from_pulse column to activities table if not exists

  2. RPC Function
    - Creates/replaces get_deal_threads_view function
    - Returns deals with their tasks in JSON format
    - Supports view modes: 'all', 'mine', 'delegated'
    - Fixes avatar column bug (uses 'avatar' instead of incorrect column)
    - Includes MW capacity data

  3. Security
    - Function is SECURITY DEFINER to access data across users
    - Uses auth.uid() to filter based on current user
*/

-- 1. Ensure Columns Exist
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS velocity_score INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS from_pulse BOOLEAN DEFAULT false;

-- 2. The Master RPC (Fixes 'avatar' bug and adds 'mw')
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
          SELECT
            a.id,
            a.summary,
            a.task_status,
            a.due_date,
            a.assigned_to_id,
            a.parent_task_id,
            a.thread_depth,
            a.from_pulse,
            u.avatar as assignee_avatar,
            u.name as assignee_name
          FROM activities a
          LEFT JOIN crm_users u ON a.assigned_to_id = u.id
          WHERE a.related_to_id = o.id
            AND a.related_to_type = 'Opportunity'
            AND a.is_task = true
          AND (
            p_view_mode = 'all'
            OR (p_view_mode = 'mine' AND a.assigned_to_id = curr_user_id)
            OR (p_view_mode = 'delegated' AND a.created_by = curr_user_id AND a.assigned_to_id != curr_user_id)
          )
          ORDER BY a.due_date ASC NULLS LAST
        ) t
      ) as tasks
    FROM opportunities o
    WHERE o.stage NOT IN ('Lost')
    ORDER BY o.velocity_score DESC, o.updated_at DESC
  ) deal_obj;

  RETURN COALESCE(result, '[]'::json);
END;
$$;