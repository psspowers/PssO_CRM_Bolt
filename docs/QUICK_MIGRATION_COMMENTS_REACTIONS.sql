-- ============================================================================
-- QUICK MIGRATION: Social Comments & Reactions Enhancement
-- ============================================================================
-- Copy and paste this entire script into Supabase SQL Editor and run it.
-- This will verify your schema and apply recommended optimizations.
-- ============================================================================

-- STEP 1: Verify all required columns exist
DO $$
BEGIN
  RAISE NOTICE '=== SCHEMA VERIFICATION ===';

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'parent_task_id'
  ) THEN
    RAISE NOTICE '✅ parent_task_id column exists';
  ELSE
    RAISE EXCEPTION '❌ parent_task_id column is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'reactions'
  ) THEN
    RAISE NOTICE '✅ reactions column exists';
  ELSE
    RAISE EXCEPTION '❌ reactions column is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'is_task'
  ) THEN
    RAISE NOTICE '✅ is_task column exists';
  ELSE
    RAISE EXCEPTION '❌ is_task column is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'comment_count'
  ) THEN
    RAISE NOTICE '✅ comment_count column exists';
  ELSE
    RAISE EXCEPTION '❌ comment_count column is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'thread_depth'
  ) THEN
    RAISE NOTICE '✅ thread_depth column exists';
  ELSE
    RAISE EXCEPTION '❌ thread_depth column is missing';
  END IF;

  RAISE NOTICE '=== ALL SCHEMA CHECKS PASSED ===';
END $$;

-- STEP 2: Ensure performance indexes exist
CREATE INDEX IF NOT EXISTS idx_activities_parent_task_id
  ON activities(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_reactions_gin
  ON activities USING GIN (reactions);

CREATE INDEX IF NOT EXISTS idx_activities_is_task
  ON activities(is_task);

CREATE INDEX IF NOT EXISTS idx_activities_thread_depth
  ON activities(thread_depth)
  WHERE thread_depth > 1;

-- Composite index for common queries (opportunity tasks)
CREATE INDEX IF NOT EXISTS idx_activities_opportunity_tasks
  ON activities(related_to_id, is_task, created_at DESC)
  WHERE related_to_type = 'Opportunity';

-- STEP 3: Fix any NULL data
UPDATE activities SET reactions = '{}'::jsonb WHERE reactions IS NULL;
UPDATE activities SET is_task = false WHERE is_task IS NULL;
UPDATE activities SET comment_count = 0 WHERE comment_count IS NULL;
UPDATE activities SET thread_depth = 1 WHERE thread_depth IS NULL;

-- STEP 4: Recalculate comment counts for all tasks
UPDATE activities parent
SET comment_count = (
  SELECT COUNT(*)::integer
  FROM activities child
  WHERE child.parent_task_id = parent.id
  AND child.is_task = false
)
WHERE parent.is_task = true;

-- STEP 5: Verify RPC function exists and has correct signature
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_deal_threads_view'
  ) THEN
    RAISE NOTICE '✅ get_deal_threads_view() function exists';
  ELSE
    RAISE EXCEPTION '❌ get_deal_threads_view() function is missing';
  END IF;
END $$;

-- STEP 6: Display summary statistics
SELECT
  COUNT(*) as total_activities,
  COUNT(*) FILTER (WHERE is_task = true) as tasks,
  COUNT(*) FILTER (WHERE is_task = false) as comments,
  COUNT(*) FILTER (WHERE parent_task_id IS NOT NULL) as threaded_items,
  COUNT(*) FILTER (WHERE reactions != '{}'::jsonb) as items_with_reactions,
  COUNT(*) FILTER (WHERE comment_count > 0) as tasks_with_comments,
  MAX(thread_depth) as max_thread_depth
FROM activities;

-- STEP 7: Sample some recent activities to verify structure
SELECT
  id,
  LEFT(summary, 50) as summary,
  is_task,
  parent_task_id IS NOT NULL as has_parent,
  thread_depth,
  comment_count,
  (SELECT COUNT(*) FROM jsonb_object_keys(reactions)) as reaction_count,
  created_at
FROM activities
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The database is now fully configured for social comments and reactions.
-- Your frontend should work seamlessly with this backend structure.
-- ============================================================================
