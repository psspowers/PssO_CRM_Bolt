/*
  # Fix Duplicate and Overly Permissive RLS Policies

  1. Remove duplicate policies (keep only one policy per action)
  2. Fix overly permissive policies that bypass RLS with USING (true)

  Issues to fix:
  - Multiple permissive policies for same role/action
  - Policies with USING (true) or WITH CHECK (true) that bypass security
*/

-- ============================================================================
-- PART 1: Remove Duplicate "Staff access" Policies
-- These are duplicates of the "Authenticated users can..." policies
-- ============================================================================

DROP POLICY IF EXISTS "Staff access activities" ON activities;
DROP POLICY IF EXISTS "Staff access contacts" ON contacts;
DROP POLICY IF EXISTS "Staff access relationships" ON relationships;

-- ============================================================================
-- PART 2: Remove Duplicate Partner Join Table Policies
-- Keep only the "Manage" policies, remove the separate ones
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage account_partners" ON account_partners;
DROP POLICY IF EXISTS "Authenticated users can view account_partners" ON account_partners;

DROP POLICY IF EXISTS "Authenticated users can manage opportunity_partners" ON opportunity_partners;
DROP POLICY IF EXISTS "Authenticated users can view opportunity_partners" ON opportunity_partners;

DROP POLICY IF EXISTS "Authenticated users can manage project_partners" ON project_partners;
DROP POLICY IF EXISTS "Authenticated users can view project_partners" ON project_partners;

-- ============================================================================
-- PART 3: Fix Overly Permissive Policies
-- Replace USING (true) with proper authentication checks
-- ============================================================================

-- account_partners: Replace overly permissive policy
DROP POLICY IF EXISTS "Manage account partners" ON account_partners;
CREATE POLICY "Manage account partners"
  ON account_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  );

-- opportunity_partners: Replace overly permissive policy
DROP POLICY IF EXISTS "Manage opportunity partners" ON opportunity_partners;
CREATE POLICY "Manage opportunity partners"
  ON opportunity_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  );

-- project_partners: Replace overly permissive policy
DROP POLICY IF EXISTS "Manage project partners" ON project_partners;
CREATE POLICY "Manage project partners"
  ON project_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  );

-- admin_activity_logs: Fix insert policy to check admin role
DROP POLICY IF EXISTS "System can insert logs" ON admin_activity_logs;
CREATE POLICY "System can insert logs"
  ON admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- notifications: Fix insert policy to require proper user context
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- session_events: Fix insert policy to verify user_id matches
DROP POLICY IF EXISTS "Service can insert session events" ON session_events;
CREATE POLICY "Service can insert session events"
  ON session_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));