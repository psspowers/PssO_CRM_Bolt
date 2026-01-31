/*
  # Enhance Comments & Reactions with Team Security

  1. Schema Verification
    - Verify parent_task_id, reactions, is_task columns exist
    - Add if missing (safe with IF NOT EXISTS)

  2. Enhanced RLS Policy
    - Team-based access for activities
    - Users can see activities on opportunities they have access to
    - Respects organizational hierarchy

  3. Data Integrity & Performance
    - Fix NULL values
    - Recalculate comment counts
    - Add optimized indexes

  4. Security
    - RLS policies aligned with team structure
    - Maintains SECURITY DEFINER for RPCs
*/

-- ============================================================================
-- PART 1: Schema Verification (Safe - No-op if columns exist)
-- ============================================================================

DO $$
BEGIN
    -- parent_task_id for threading
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name='activities' AND column_name='parent_task_id'
    ) THEN
        ALTER TABLE public.activities 
        ADD COLUMN parent_task_id UUID REFERENCES public.activities(id) ON DELETE CASCADE;
    END IF;

    -- reactions for likes/emojis
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name='activities' AND column_name='reactions'
    ) THEN
        ALTER TABLE public.activities 
        ADD COLUMN reactions JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- is_task to distinguish tasks from comments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name='activities' AND column_name='is_task'
    ) THEN
        ALTER TABLE public.activities 
        ADD COLUMN is_task BOOLEAN DEFAULT false;
    END IF;

    RAISE NOTICE '✅ Schema verification complete';
END $$;

-- ============================================================================
-- PART 2: Enhanced RLS Policy for Team Visibility
-- ============================================================================

-- Replace overly-permissive policy with team-based access
DROP POLICY IF EXISTS "Authenticated users can view activities" ON activities;
DROP POLICY IF EXISTS "Team view shared deal activities" ON activities;
DROP POLICY IF EXISTS "Team can view shared deal activities" ON activities;

CREATE POLICY "Team can view shared deal activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    -- 1. User created the activity
    COALESCE(created_by_id, created_by) = auth.uid()
    OR 
    -- 2. Activity is assigned to the user
    assigned_to_id = auth.uid()
    OR
    -- 3. Activity linked to Opportunity user can access
    (
      related_to_type = 'Opportunity' 
      AND EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = activities.related_to_id
        AND (
          -- User owns the opportunity
          o.owner_id = auth.uid()
          -- OR user manages the opportunity owner
          OR EXISTS (
            SELECT 1 FROM user_hierarchy uh
            WHERE uh.manager_id = auth.uid()
            AND uh.subordinate_id = o.owner_id
          )
        )
      )
    )
    OR
    -- 4. Activity linked to Account (accessible to all authenticated users)
    (
      related_to_type = 'Account'
      AND EXISTS (
        SELECT 1 FROM accounts a WHERE a.id = activities.related_to_id
      )
    )
    OR
    -- 5. Activity linked to Project user can access
    (
      related_to_type = 'Project'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = activities.related_to_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM user_hierarchy uh
            WHERE uh.manager_id = auth.uid()
            AND uh.subordinate_id = p.owner_id
          )
        )
      )
    )
    OR
    -- 6. User is admin/internal (can see everything)
    EXISTS (
      SELECT 1 FROM crm_users cu
      WHERE cu.id = auth.uid()
      AND cu.role IN ('admin', 'super_admin', 'internal')
    )
  );

-- ============================================================================
-- PART 3: Data Integrity Fixes
-- ============================================================================

-- Fix NULL values
UPDATE activities SET reactions = '{}'::jsonb WHERE reactions IS NULL;
UPDATE activities SET is_task = false WHERE is_task IS NULL;
UPDATE activities SET comment_count = 0 WHERE comment_count IS NULL;

-- Recalculate comment counts
UPDATE activities parent
SET comment_count = (
  SELECT COUNT(*)::integer
  FROM activities child
  WHERE child.parent_task_id = parent.id
  AND child.is_task = false
)
WHERE parent.is_task = true;

-- ============================================================================
-- PART 4: Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_activities_parent_task_id
  ON activities(parent_task_id) WHERE parent_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_reactions_gin
  ON activities USING GIN (reactions);

CREATE INDEX IF NOT EXISTS idx_activities_is_task
  ON activities(is_task);

CREATE INDEX IF NOT EXISTS idx_activities_opportunity_tasks
  ON activities(related_to_id, is_task, created_at DESC)
  WHERE related_to_type = 'Opportunity';

CREATE INDEX IF NOT EXISTS idx_activities_created_assigned
  ON activities(created_by_id, assigned_to_id);

-- ============================================================================
-- PART 5: Verification & Stats
-- ============================================================================

DO $$
DECLARE
  task_ct INTEGER;
  comment_ct INTEGER;
  reaction_ct INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE is_task = true),
    COUNT(*) FILTER (WHERE is_task = false),
    COUNT(*) FILTER (WHERE reactions != '{}'::jsonb)
  INTO task_ct, comment_ct, reaction_ct
  FROM activities;
  
  RAISE NOTICE '✅ Migration complete';
  RAISE NOTICE '📊 Stats: % tasks, % comments, % with reactions', 
    task_ct, comment_ct, reaction_ct;
END $$;
