/*
  # Task Threads RPC Function

  1. Purpose
    - Fetch all tasks grouped by deal (opportunity)
    - Calculate progress per deal (completed / total)
    - Return nested tree structure for UI rendering

  2. Returns
    - JSON array of deal groups with nested tasks
    - Each task includes children array for threading
*/

CREATE OR REPLACE FUNCTION get_task_threads(
  p_user_id UUID DEFAULT NULL,
  p_filter TEXT DEFAULT 'all'
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH RECURSIVE task_tree AS (
    -- Root tasks (depth = 1)
    SELECT 
      a.id,
      a.summary,
      a.details,
      a.task_status,
      a.priority,
      a.due_date,
      a.assigned_to_id,
      a.parent_task_id,
      a.thread_depth,
      a.root_deal_id,
      a.created_at,
      1 as level,
      ARRAY[a.id] as path
    FROM activities a
    WHERE a.is_task = true
      AND a.parent_task_id IS NULL
      AND (p_filter = 'all' OR a.assigned_to_id = p_user_id OR a.assigned_to_id IS NULL)
    
    UNION ALL
    
    -- Child tasks (depth > 1)
    SELECT 
      a.id,
      a.summary,
      a.details,
      a.task_status,
      a.priority,
      a.due_date,
      a.assigned_to_id,
      a.parent_task_id,
      a.thread_depth,
      a.root_deal_id,
      a.created_at,
      tt.level + 1,
      tt.path || a.id
    FROM activities a
    INNER JOIN task_tree tt ON a.parent_task_id = tt.id
    WHERE a.is_task = true
      AND (p_filter = 'all' OR a.assigned_to_id = p_user_id OR a.assigned_to_id IS NULL)
  ),
  deal_stats AS (
    SELECT 
      tt.root_deal_id,
      COUNT(*) as total_tasks,
      COUNT(*) FILTER (WHERE tt.task_status = 'Completed') as completed_tasks,
      ROUND((COUNT(*) FILTER (WHERE tt.task_status = 'Completed')::numeric / COUNT(*)::numeric) * 100, 0) as progress
    FROM task_tree tt
    WHERE tt.root_deal_id IS NOT NULL
    GROUP BY tt.root_deal_id
  )
  SELECT json_agg(
    json_build_object(
      'deal', json_build_object(
        'id', o.id,
        'name', o.name,
        'stage', o.stage,
        'value', o.value,
        'account_name', acc.name
      ),
      'progress', COALESCE(ds.progress, 0),
      'total_tasks', COALESCE(ds.total_tasks, 0),
      'completed_tasks', COALESCE(ds.completed_tasks, 0),
      'tasks', (
        SELECT json_agg(
          json_build_object(
            'id', tt.id,
            'summary', tt.summary,
            'details', tt.details,
            'status', tt.task_status,
            'priority', tt.priority,
            'dueDate', tt.due_date,
            'assignedToId', tt.assigned_to_id,
            'assigneeName', u.name,
            'assigneeAvatar', u.avatar_url,
            'parentTaskId', tt.parent_task_id,
            'depth', tt.thread_depth,
            'createdAt', tt.created_at
          ) ORDER BY tt.created_at ASC
        )
        FROM task_tree tt
        LEFT JOIN crm_users u ON u.id = tt.assigned_to_id
        WHERE tt.root_deal_id = o.id
      )
    ) ORDER BY o.name
  ) INTO v_result
  FROM opportunities o
  LEFT JOIN accounts acc ON acc.id = o.account_id
  LEFT JOIN deal_stats ds ON ds.root_deal_id = o.id
  WHERE o.id IN (SELECT DISTINCT root_deal_id FROM task_tree WHERE root_deal_id IS NOT NULL);
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_task_threads TO authenticated;