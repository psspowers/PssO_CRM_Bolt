-- ==========================================
-- ENTERPRISE HIERARCHY SYSTEM MIGRATION
-- ==========================================
-- This migration creates the database structure needed for:
-- 1. Organization chart management
-- 2. Hierarchy-based RLS policies
-- 3. Team-based data access control
--
-- Run this AFTER the base CRM tables are created
-- ==========================================

-- ==========================================
-- 1. ADD reports_to COLUMN TO crm_users
-- ==========================================
-- This column stores the direct manager relationship

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_users' AND column_name = 'reports_to') THEN
    
    ALTER TABLE public.crm_users 
    ADD COLUMN reports_to uuid REFERENCES public.crm_users(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added reports_to column to crm_users';
  ELSE
    RAISE NOTICE 'reports_to column already exists in crm_users';
  END IF;
END
$$;

-- Index for efficient manager lookups
CREATE INDEX IF NOT EXISTS idx_crm_users_reports_to 
  ON public.crm_users(reports_to);

-- ==========================================
-- 2. CREATE user_hierarchy TABLE
-- ==========================================
-- This table stores the flattened hierarchy for efficient lookups
-- It is populated by the org-hierarchy edge function

CREATE TABLE IF NOT EXISTS public.user_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
  subordinate_id uuid NOT NULL REFERENCES public.crm_users(id) ON DELETE CASCADE,
  depth integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure unique manager-subordinate pairs
  CONSTRAINT unique_manager_subordinate UNIQUE(manager_id, subordinate_id),
  
  -- Prevent self-referencing
  CONSTRAINT no_self_reference CHECK (manager_id != subordinate_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_manager 
  ON public.user_hierarchy(manager_id);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_subordinate 
  ON public.user_hierarchy(subordinate_id);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_depth 
  ON public.user_hierarchy(depth);

-- ==========================================
-- 3. RLS POLICIES FOR user_hierarchy
-- ==========================================

ALTER TABLE public.user_hierarchy ENABLE ROW LEVEL SECURITY;

-- Everyone can read hierarchy (needed for frontend filtering)
CREATE POLICY "Read hierarchy" ON public.user_hierarchy
  FOR SELECT USING (true);

-- Only service role can modify (via edge function)
CREATE POLICY "Service role manages hierarchy" ON public.user_hierarchy
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- 4. HIERARCHY-AWARE RLS POLICIES FOR ENTITIES
-- ==========================================
-- These policies allow managers to see their team's data

-- Drop existing policies first (if they exist) to avoid conflicts
DO $$
BEGIN
  -- Opportunities
  DROP POLICY IF EXISTS "View own and team opportunities" ON public.opportunities;
  DROP POLICY IF EXISTS "Manage own opportunities" ON public.opportunities;
  
  -- Accounts
  DROP POLICY IF EXISTS "View own and team accounts" ON public.accounts;
  DROP POLICY IF EXISTS "Manage own accounts" ON public.accounts;
  
  -- Contacts
  DROP POLICY IF EXISTS "View own and team contacts" ON public.contacts;
  DROP POLICY IF EXISTS "Manage own contacts" ON public.contacts;
  
  -- Projects
  DROP POLICY IF EXISTS "View own and team projects" ON public.projects;
  DROP POLICY IF EXISTS "Manage own projects" ON public.projects;
  
  -- Activities
  DROP POLICY IF EXISTS "View own and team activities" ON public.activities;
  DROP POLICY IF EXISTS "Manage own activities" ON public.activities;
END
$$;

-- OPPORTUNITIES: Hierarchy-aware SELECT policy
CREATE POLICY "View own and team opportunities" ON public.opportunities
  FOR SELECT USING (
    -- Own records
    owner_id = auth.uid()
    -- Team records (subordinates)
    OR owner_id IN (
      SELECT subordinate_id FROM public.user_hierarchy WHERE manager_id = auth.uid()
    )
    -- Admin sees all
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin'
    )
    -- Internal users see all (optional - remove if you want strict hierarchy)
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'internal'
    )
  );

-- OPPORTUNITIES: Hierarchy-aware INSERT/UPDATE/DELETE policy
CREATE POLICY "Manage own opportunities" ON public.opportunities
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ACCOUNTS: Hierarchy-aware SELECT policy
CREATE POLICY "View own and team accounts" ON public.accounts
  FOR SELECT USING (
    owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id FROM public.user_hierarchy WHERE manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role IN ('admin', 'internal')
    )
  );

CREATE POLICY "Manage own accounts" ON public.accounts
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CONTACTS: Hierarchy-aware SELECT policy
CREATE POLICY "View own and team contacts" ON public.contacts
  FOR SELECT USING (
    owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id FROM public.user_hierarchy WHERE manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role IN ('admin', 'internal')
    )
  );

CREATE POLICY "Manage own contacts" ON public.contacts
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PROJECTS: Hierarchy-aware SELECT policy
CREATE POLICY "View own and team projects" ON public.projects
  FOR SELECT USING (
    owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id FROM public.user_hierarchy WHERE manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role IN ('admin', 'internal')
    )
  );

CREATE POLICY "Manage own projects" ON public.projects
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ACTIVITIES: Hierarchy-aware SELECT policy
CREATE POLICY "View own and team activities" ON public.activities
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT subordinate_id FROM public.user_hierarchy WHERE manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role IN ('admin', 'internal')
    )
  );

CREATE POLICY "Manage own activities" ON public.activities
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 5. HELPER FUNCTION: Get all subordinates
-- ==========================================
-- This function can be used in RLS policies or queries

CREATE OR REPLACE FUNCTION get_subordinates(manager_uuid uuid)
RETURNS TABLE(subordinate_id uuid, depth integer) AS $$
BEGIN
  RETURN QUERY
  SELECT uh.subordinate_id, uh.depth
  FROM public.user_hierarchy uh
  WHERE uh.manager_id = manager_uuid
  ORDER BY uh.depth, uh.subordinate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. HELPER FUNCTION: Check if user is subordinate
-- ==========================================

CREATE OR REPLACE FUNCTION is_subordinate(check_user_id uuid, potential_manager_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_hierarchy
    WHERE manager_id = potential_manager_id
    AND subordinate_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check reports_to column exists
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'crm_users' AND column_name = 'reports_to';

-- Check user_hierarchy table exists
-- SELECT * FROM information_schema.tables 
-- WHERE table_name = 'user_hierarchy';

-- Check RLS policies
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('user_hierarchy', 'opportunities', 'accounts', 'contacts', 'projects', 'activities')
-- ORDER BY tablename, policyname;

-- ==========================================
-- USAGE NOTES
-- ==========================================
-- 
-- After running this migration:
-- 1. Use the Admin Dashboard to set up the org chart
-- 2. Go to the "Org Chart" tab and drag-and-drop users to assign managers
-- 3. The edge function automatically updates reports_to and rebuilds hierarchy
-- 4. The RLS policies will automatically filter data based on hierarchy
--
-- IMPORTANT: Do NOT update reports_to directly in the database!
-- Always use the Org Chart UI to ensure the user_hierarchy table stays in sync.
--
-- The org-hierarchy edge function handles:
-- - Fetching users with hierarchy data
-- - Updating manager assignments (with circular reference prevention)
-- - Rebuilding the user_hierarchy table
