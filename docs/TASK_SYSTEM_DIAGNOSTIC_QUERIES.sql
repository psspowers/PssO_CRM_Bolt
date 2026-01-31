-- ============================================================================
-- TASK/COMMENT SYSTEM DIAGNOSTIC QUERIES
-- Run these to understand the current state and identify issues
-- ============================================================================

-- Query 1: Activity Type Distribution
-- Shows how activities are classified
SELECT
  CASE
    WHEN is_task = true AND parent_task_id IS NULL THEN 'Root Task'
    WHEN is_task = false AND parent_task_id IS NULL THEN 'Root Note/Activity Log'
    WHEN is_task = true AND parent_task_id IS NOT NULL THEN 'Subtask'
    WHEN is_task = false AND parent_task_id IS NOT NULL THEN 'Comment'
  END as activity_type,
  COUNT(*) as count,
  related_to_type as linked_to_entity_type
FROM activities
GROUP BY
  CASE
    WHEN is_task = true AND parent_task_id IS NULL THEN 'Root Task'
    WHEN is_task = false AND parent_task_id IS NULL THEN 'Root Note/Activity Log'
    WHEN is_task = true AND parent_task_id IS NOT NULL THEN 'Subtask'
    WHEN is_task = false AND parent_task_id IS NOT NULL THEN 'Comment'
  END,
  related_to_type
ORDER BY activity_type;

-- Query 2: Check for Data Integrity Issues
-- Verifies parent_task_id matches related_to_id for child activities
SELECT
  COUNT(*) as potential_issues,
  'Children where related_to_id != parent_task_id' as issue_type
FROM activities
WHERE parent_task_id IS NOT NULL
  AND related_to_id != parent_task_id

UNION ALL

SELECT
  COUNT(*) as potential_issues,
  'Children where related_to_type != Activity' as issue_type
FROM activities
WHERE parent_task_id IS NOT NULL
  AND related_to_type != 'Activity'

UNION ALL

SELECT
  COUNT(*) as potential_issues,
  'Root activities linked to Activity (should be impossible)' as issue_type
FROM activities
WHERE parent_task_id IS NULL
  AND related_to_type = 'Activity';

-- Query 3: Find All Root Notes (Activity Logs)
-- These may not display properly in TasksScreen
SELECT
  id,
  LEFT(summary, 60) as summary_preview,
  related_to_type as linked_to,
  created_at,
  created_by_id,
  CASE
    WHEN assigned_to_id IS NOT NULL THEN 'HAS ASSIGNEE (weird for note)'
    ELSE 'No assignee (normal for note)'
  END as assignment_status
FROM activities
WHERE is_task = false
  AND parent_task_id IS NULL
ORDER BY created_at DESC;

-- Query 4: Threading Depth Analysis
-- Verify max depth constraint is working
SELECT
  thread_depth,
  COUNT(*) as count,
  MAX(CASE WHEN is_task = true THEN 1 ELSE 0 END) as has_tasks,
  MAX(CASE WHEN is_task = false THEN 1 ELSE 0 END) as has_comments
FROM activities
GROUP BY thread_depth
ORDER BY thread_depth;

-- Query 5: Orphaned Activities
-- Activities that reference non-existent parents
SELECT
  a.id,
  a.summary,
  a.parent_task_id as references_parent,
  'Parent does not exist' as issue
FROM activities a
WHERE a.parent_task_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activities parent
    WHERE parent.id = a.parent_task_id
  );

-- Query 6: Comment Count Accuracy
-- Check if cached comment_count matches actual count
WITH actual_counts AS (
  SELECT
    parent_task_id,
    COUNT(*) as actual_comment_count
  FROM activities
  WHERE is_task = false
    AND parent_task_id IS NOT NULL
  GROUP BY parent_task_id
)
SELECT
  a.id,
  a.summary,
  a.comment_count as cached_count,
  COALESCE(ac.actual_comment_count, 0) as actual_count,
  CASE
    WHEN a.comment_count = COALESCE(ac.actual_comment_count, 0) THEN '✓ Match'
    ELSE '✗ Mismatch'
  END as status
FROM activities a
LEFT JOIN actual_counts ac ON a.id = ac.parent_task_id
WHERE a.is_task = true
ORDER BY
  CASE WHEN a.comment_count != COALESCE(ac.actual_comment_count, 0) THEN 0 ELSE 1 END,
  a.comment_count DESC;

-- Query 7: Reaction Usage
-- See which activities have reactions
SELECT
  CASE
    WHEN is_task = true AND parent_task_id IS NULL THEN 'Root Task'
    WHEN is_task = false AND parent_task_id IS NULL THEN 'Root Note'
    WHEN is_task = true AND parent_task_id IS NOT NULL THEN 'Subtask'
    WHEN is_task = false AND parent_task_id IS NOT NULL THEN 'Comment'
  END as activity_type,
  COUNT(*) FILTER (WHERE reactions != '{}'::jsonb) as with_reactions,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE reactions != '{}'::jsonb) / COUNT(*), 1) as percentage
FROM activities
GROUP BY
  CASE
    WHEN is_task = true AND parent_task_id IS NULL THEN 'Root Task'
    WHEN is_task = false AND parent_task_id IS NULL THEN 'Root Note'
    WHEN is_task = true AND parent_task_id IS NOT NULL THEN 'Subtask'
    WHEN is_task = false AND parent_task_id IS NOT NULL THEN 'Comment'
  END;

-- Query 8: Find Complex Threading Examples
-- Activities with both subtasks AND comments
SELECT
  a.id,
  a.summary as parent_task,
  (SELECT COUNT(*) FROM activities WHERE parent_task_id = a.id AND is_task = true) as subtask_count,
  (SELECT COUNT(*) FROM activities WHERE parent_task_id = a.id AND is_task = false) as comment_count,
  a.comment_count as cached_comment_count
FROM activities a
WHERE a.is_task = true
  AND EXISTS (
    SELECT 1 FROM activities sub WHERE sub.parent_task_id = a.id
  )
ORDER BY
  (SELECT COUNT(*) FROM activities WHERE parent_task_id = a.id) DESC;

-- Query 9: Dead Columns Check
-- Verify parent_id is truly unused
SELECT
  'parent_id' as column_name,
  COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as non_null_count,
  COUNT(*) as total_records,
  CASE
    WHEN COUNT(*) FILTER (WHERE parent_id IS NOT NULL) = 0 THEN '✓ UNUSED - Can be dropped'
    ELSE '✗ IN USE - Do not drop'
  END as recommendation
FROM activities

UNION ALL

SELECT
  'parent_task_id' as column_name,
  COUNT(*) FILTER (WHERE parent_task_id IS NOT NULL) as non_null_count,
  COUNT(*) as total_records,
  CASE
    WHEN COUNT(*) FILTER (WHERE parent_task_id IS NOT NULL) = 0 THEN '✗ UNUSED'
    ELSE '✓ ACTIVELY USED'
  END as recommendation
FROM activities;

-- Query 10: Sample Threading Structure
-- Shows actual parent-child relationships
WITH RECURSIVE thread AS (
  -- Root
  SELECT
    id,
    summary,
    parent_task_id,
    is_task,
    1 as level,
    ARRAY[id] as path,
    id::text as display_path
  FROM activities
  WHERE parent_task_id IS NULL
    AND related_to_type = 'Opportunity'
  LIMIT 5  -- Just show a few examples

  UNION ALL

  -- Children
  SELECT
    a.id,
    a.summary,
    a.parent_task_id,
    a.is_task,
    t.level + 1,
    t.path || a.id,
    t.display_path || ' > ' || a.id::text
  FROM activities a
  JOIN thread t ON a.parent_task_id = t.id
  WHERE t.level < 3  -- Respect max depth
)
SELECT
  REPEAT('  ', level - 1) ||
  CASE
    WHEN is_task THEN '📋 TASK: '
    ELSE '💬 COMMENT: '
  END ||
  LEFT(summary, 50) as threaded_structure,
  level as depth,
  display_path
FROM thread
ORDER BY path;
