/*
  # Fix RLS Policies for Security

  1. Security Issues Fixed
    - Remove overly permissive "Read access" policy (qual: true)
    - Remove duplicate policies
    - Ensure only authenticated users can access data
    - Admins can manage all users via is_admin() function
    - Service role automatically bypasses all RLS policies

  2. New Policies
    - **SELECT**: Authenticated users can view all users (for CRM functionality)
    - **INSERT**: Only service role can insert (via edge functions)
    - **UPDATE**: Users can update own profile, admins can update all
    - **DELETE**: Only admins can delete users

  3. Important Notes
    - Service role key (used in edge functions) automatically bypasses RLS
    - The is_admin() function checks if the current user has role='admin'
    - Regular users cannot create accounts - only via admin using edge function
*/

-- Drop all existing policies on crm_users
DROP POLICY IF EXISTS "Read access" ON crm_users;
DROP POLICY IF EXISTS "Read all users" ON crm_users;
DROP POLICY IF EXISTS "Users can view own profile" ON crm_users;
DROP POLICY IF EXISTS "Insert own" ON crm_users;
DROP POLICY IF EXISTS "Update own" ON crm_users;
DROP POLICY IF EXISTS "Users can update own profile" ON crm_users;
DROP POLICY IF EXISTS "Admins can manage all users" ON crm_users;

-- CREATE CLEAN, SECURE POLICIES

-- SELECT: Authenticated users can view all users (needed for CRM functionality)
CREATE POLICY "Authenticated users can view all users"
  ON crm_users
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: No regular users can insert (only service role via edge functions)
-- Service role automatically bypasses RLS, so no INSERT policy needed
-- This prevents any authenticated user from creating records directly

-- UPDATE: Users can update own profile
CREATE POLICY "Users can update own profile"
  ON crm_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE: Admins can update all users
CREATE POLICY "Admins can update all users"
  ON crm_users
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Only admins can delete users
CREATE POLICY "Admins can delete users"
  ON crm_users
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Ensure RLS is enabled
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;

-- Fix user_hierarchy policies
DROP POLICY IF EXISTS "Admins can manage hierarchy" ON user_hierarchy;
DROP POLICY IF EXISTS "Managers can view subordinates" ON user_hierarchy;
DROP POLICY IF EXISTS "Subordinates can view managers" ON user_hierarchy;

-- SELECT: Authenticated users can view hierarchy (for org chart)
CREATE POLICY "Authenticated users can view hierarchy"
  ON user_hierarchy
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Only service role (via edge functions)
-- No policies needed - service role bypasses RLS

-- Ensure RLS is enabled
ALTER TABLE user_hierarchy ENABLE ROW LEVEL SECURITY;
