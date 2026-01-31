/*
  ============================================================================
  SOCIAL COMMENTS & REACTIONS - VERIFICATION & ENHANCEMENT MIGRATION
  ============================================================================

  PURPOSE:
  Verify and enhance the database schema for social comments and reactions
  functionality in the Task Master system.

  CURRENT STATUS:
  ✅ All required columns already exist in the activities table
  ✅ RPC function get_deal_threads_view() exists and includes all fields
  ✅ Basic RLS policies are in place (very permissive - all authenticated users)

  THIS MIGRATION PROVIDES:
  1. Schema verification queries
  2. Optional enhanced RLS policies for team-based access control
  3. Performance optimization indexes
  4. Data integrity checks

  EXECUTION:
  - Part 1 (Verification): Run to check current state
  - Part 2 (Optional): Run if you want tighter security policies
  - Part 3 (Recommended): Run to ensure optimal performance
  ============================================================================
*/


-- ============================================================================
-- PART 1: VERIFICATION QUERIES
-- ============================================================================

-- Check that all required columns exist
SELECT
  'activities schema check' as check_name,
  CASE
    WHEN COUNT(*) = 5 THEN '✅ PASS - All columns exist'
    ELSE '❌ FAIL - Missing columns: ' || (5 - COUNT(*))::text
  END as result
FROM information_schema.columns
WHERE table_name = 'activities'
  AND column_name IN ('parent_task_id', 'reactions', 'is_task', 'comment_count', 'thread_depth');

-- Verify RPC function exists
SELECT
  'get_deal_threads_view function check' as check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS - Function exists'
    ELSE '❌ FAIL - Function missing'
  END as result
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_deal_threads_view';

-- Check RLS is enabled on activities table
SELECT
  'RLS enabled check' as check_name,
  CASE
    WHEN relrowsecurity THEN '✅ PASS - RLS enabled'
    ELSE '❌ FAIL - RLS not enabled'
  END as result
FROM pg_class
WHERE relname = 'activities';

-- Count existing activities with threading data
SELECT
  COUNT(*) FILTER (WHERE parent_task_id IS NOT NULL) as threaded_activities,
  COUNT(*) FILTER (WHERE reactions != '{}'::jsonb) as activities_with_reactions,
  COUNT(*) FILTER (WHERE comment_count > 0) as activities_with_comments,
  COUNT(*) FILTER (WHERE is_task = true) as tasks,
  COUNT(*) FILTER (WHERE is_task = false) as comments
FROM activities;


-- ============================================================================
-- PART 2: OPTIONAL - ENHANCED RLS POLICIES (Team-Based Access)
-- ============================================================================

/*
  CURRENT STATE: All authenticated users can see all activities

  ENHANCED STATE: Activities are visible based on:
  - User owns/is assigned to the activity
  - User has access to the linked opportunity (via team hierarchy)
  - Activity is linked to an account/contact the user has access to

  NOTE: This provides better security but requires the user_hierarchy table
  to be properly maintained. Only run this if you need stricter access control.
*/

-- UNCOMMENT BELOW TO ENABLE ENHANCED SECURITY
/*
-- Drop existing overly-permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view activities" ON activities;

-- Create new team-based SELECT policy
CREATE POLICY "Team members can view shared activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    -- User is the activity creator or assignee
    created_by_id = auth.uid()
    OR assigned_to_id = auth.uid()

    -- OR: Activity is linked to an opportunity the user has access to
    OR (
      related_to_type = 'Opportunity'
      AND EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = activities.related_to_id
        AND (
          o.created_by = auth.uid()
          OR o.assigned_to_id = auth.uid()
          -- Team hierarchy check
          OR EXISTS (
            SELECT 1 FROM user_hierarchy uh
            WHERE uh.user_id = auth.uid()
            AND (
              uh.can_see_user_id = o.assigned_to_id
              OR uh.can_see_user_id = o.created_by
            )
          )
        )
      )
    )

    -- OR: Activity is linked to an account the user has access to
    OR (
      related_to_type = 'Account'
      AND EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = activities.related_to_id
      )
    )

    -- OR: User is internal staff (can see all)
    OR EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'internal')
    )
  );

-- Update policy for better INSERT control
DROP POLICY IF EXISTS "Authenticated users can create activities" ON activities;
CREATE POLICY "Authenticated users can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be a valid CRM user
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
    )
    -- Set created_by_id to current user
    AND created_by_id = auth.uid()
  );

-- Update policy to only allow updating your own activities or if you're a manager
DROP POLICY IF EXISTS "Authenticated users can update activities" ON activities;
CREATE POLICY "Users can update own or managed activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    -- User owns the activity
    created_by_id = auth.uid()
    OR assigned_to_id = auth.uid()
    -- OR: User is a manager who can see the activity assignee
    OR EXISTS (
      SELECT 1 FROM user_hierarchy uh
      WHERE uh.user_id = auth.uid()
      AND uh.can_see_user_id = activities.assigned_to_id
    )
    -- OR: User is admin
    OR EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Update policy to only allow deleting your own activities or if you're admin
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON activities;
CREATE POLICY "Users can delete own activities or admins can delete any"
  ON activities FOR DELETE
  TO authenticated
  USING (
    -- User owns the activity
    created_by_id = auth.uid()
    -- OR: User is admin
    OR EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
*/


-- ============================================================================
-- PART 3: RECOMMENDED - PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Ensure critical indexes exist for query performance
CREATE INDEX IF NOT EXISTS idx_activities_parent_task_id
  ON activities(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_reactions_gin
  ON activities USING GIN (reactions);

CREATE INDEX IF NOT EXISTS idx_activities_is_task
  ON activities(is_task);

CREATE INDEX IF NOT EXISTS idx_activities_related_to
  ON activities(related_to_type, related_to_id);

CREATE INDEX IF NOT EXISTS idx_activities_thread_depth
  ON activities(thread_depth)
  WHERE thread_depth > 1;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_activities_opportunity_tasks
  ON activities(related_to_id, is_task, created_at DESC)
  WHERE related_to_type = 'Opportunity';


-- ============================================================================
-- PART 4: DATA INTEGRITY & MAINTENANCE
-- ============================================================================

-- Ensure comment_count is accurate for all tasks
UPDATE activities
SET comment_count = (
  SELECT COUNT(*)::integer
  FROM activities child
  WHERE child.parent_task_id = activities.id
  AND child.is_task = false
)
WHERE is_task = true
AND (
  comment_count IS NULL
  OR comment_count != (
    SELECT COUNT(*)::integer
    FROM activities child
    WHERE child.parent_task_id = activities.id
    AND child.is_task = false
  )
);

-- Set default reactions for any NULL values
UPDATE activities
SET reactions = '{}'::jsonb
WHERE reactions IS NULL;

-- Ensure is_task is properly set (default should be false for comments)
UPDATE activities
SET is_task = COALESCE(is_task, false)
WHERE is_task IS NULL;


-- ============================================================================
-- PART 5: VALIDATION QUERIES (Run after migration)
-- ============================================================================

-- Verify threading structure integrity
SELECT
  'Threading integrity check' as check_name,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS - No orphaned threads'
    ELSE '⚠️ WARNING - Found ' || COUNT(*)::text || ' orphaned activities'
  END as result
FROM activities a
WHERE a.parent_task_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM activities parent
    WHERE parent.id = a.parent_task_id
  );

-- Verify reactions data structure
SELECT
  'Reactions data structure check' as check_name,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS - All reactions are valid JSONB objects'
    ELSE '❌ FAIL - Found ' || COUNT(*)::text || ' invalid reactions'
  END as result
FROM activities
WHERE reactions IS NOT NULL
  AND jsonb_typeof(reactions) != 'object';

-- Check comment_count accuracy
SELECT
  'Comment count accuracy check' as check_name,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS - All comment counts are accurate'
    ELSE '⚠️ WARNING - Found ' || COUNT(*)::text || ' tasks with inaccurate counts'
  END as result
FROM activities parent
WHERE parent.is_task = true
  AND parent.comment_count != (
    SELECT COUNT(*)::integer
    FROM activities child
    WHERE child.parent_task_id = parent.id
    AND child.is_task = false
  );

-- Sample data to verify structure
SELECT
  id,
  summary,
  is_task,
  parent_task_id,
  thread_depth,
  comment_count,
  jsonb_object_keys(reactions) as reactors,
  created_at
FROM activities
WHERE parent_task_id IS NOT NULL
   OR comment_count > 0
   OR reactions != '{}'::jsonb
ORDER BY created_at DESC
LIMIT 5;


-- ============================================================================
-- PART 6: RPC FUNCTION VERIFICATION
-- ============================================================================

-- Test the get_deal_threads_view function
-- This should return properly structured JSON with all thread data
SELECT get_deal_threads_view('all');

-- Check function definition includes all required fields
SELECT
  'RPC function columns check' as check_name,
  CASE
    WHEN prosrc LIKE '%reactions%'
     AND prosrc LIKE '%comment_count%'
     AND prosrc LIKE '%parent_task_id%'
     AND prosrc LIKE '%is_task%'
     AND prosrc LIKE '%like_count%' THEN '✅ PASS - All fields included'
    ELSE '❌ FAIL - Function missing required fields'
  END as result
FROM pg_proc
WHERE proname = 'get_deal_threads_view';


-- ============================================================================
-- SUMMARY
-- ============================================================================

/*
  VERIFICATION CHECKLIST:

  ✅ Column schema (parent_task_id, reactions, is_task, comment_count, thread_depth)
  ✅ RPC function (get_deal_threads_view)
  ✅ RLS policies (activities table)
  ✅ Performance indexes
  ✅ Data integrity

  CURRENT RLS SECURITY LEVEL:
  - PERMISSIVE: All authenticated CRM users can see all activities
  - This works well for small teams and uses the RPC function for filtering

  IF YOU NEED STRICTER SECURITY:
  - Uncomment Part 2 to enable team-based access control
  - Requires user_hierarchy table to be properly maintained
  - More secure but adds complexity to queries

  NEXT STEPS:
  1. Run Part 1 (Verification) to check current state
  2. Run Part 3 (Performance) to ensure optimal indexes
  3. Run Part 4 (Maintenance) to fix any data inconsistencies
  4. Run Part 5 (Validation) to verify everything is working
  5. Test the frontend functionality

  FRONTEND INTEGRATION:
  The frontend is already using:
  - reactions: JSONB object mapping userId -> reactionType
  - comment_count: Integer count of child comments
  - parent_task_id: UUID reference to parent activity
  - is_task: Boolean to distinguish tasks from comments

  All data flows through get_deal_threads_view() RPC which:
  - Recursively builds the task tree
  - Calculates like_count from reactions object
  - Calculates comment_count from child activities
  - Filters by view_mode ('all', 'mine', 'delegated')
  - Returns structured JSON for the frontend
*/
