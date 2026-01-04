/*
  # Operation Iron Dome - Phase 2: Extend RLS & Automate Hierarchy

  ## Overview
  This migration extends the hierarchical security model from opportunities to accounts and projects,
  and automates the user_hierarchy refresh when organizational structure changes.

  ## Part A: Automate Hierarchy Refresh
  
  1. **Trigger Function**: Creates trigger_refresh_hierarchy() to call refresh_user_hierarchy()
  2. **Trigger on crm_users**: Automatically refreshes hierarchy when:
     - New users are created
     - User's reports_to relationship changes
     - User's role changes
  
  This ensures the security map (user_hierarchy table) is always current.

  ## Part B: Secure Accounts and Projects
  
  Applies the same hierarchical security pattern used for opportunities:
  - Admins see everything
  - Users see their own records
  - Managers see their subordinates' records (via user_hierarchy)
  
  ### Tables Updated
  - **accounts**: View/modify accounts owned by self or subordinates
  - **projects**: View/modify projects owned by self or subordinates
  
  ## Security Model
  - SELECT: Users can view records they own or their subordinates own
  - INSERT: Users can create records for themselves (admins can create for anyone)
  - UPDATE: Same visibility as SELECT
  - DELETE: Admin-only (not implemented in this phase)
*/

-- ============================================================================
-- PART A: AUTOMATE HIERARCHY REFRESH
-- ============================================================================

-- Create trigger function that refreshes user hierarchy
CREATE OR REPLACE FUNCTION trigger_refresh_hierarchy()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_user_hierarchy();
  RETURN NEW;
END;
$$;

-- Create trigger on crm_users table
DROP TRIGGER IF EXISTS auto_refresh_user_hierarchy ON crm_users;

CREATE TRIGGER auto_refresh_user_hierarchy
  AFTER INSERT OR UPDATE OF reports_to, role
  ON crm_users
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_hierarchy();

-- ============================================================================
-- PART B: SECURE ACCOUNTS TABLE
-- ============================================================================

-- Drop existing role-based policies
DROP POLICY IF EXISTS "view_accounts_by_role" ON accounts;
DROP POLICY IF EXISTS "insert_accounts" ON accounts;
DROP POLICY IF EXISTS "update_accounts_by_role" ON accounts;
DROP POLICY IF EXISTS "delete_accounts_by_role" ON accounts;

-- Apply hierarchical security pattern (same as opportunities)

-- SELECT: View own accounts + subordinates' accounts + admin sees all
CREATE POLICY "view_accounts_hierarchy"
  ON accounts FOR SELECT
  TO public
  USING (
    is_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id 
      FROM user_hierarchy 
      WHERE manager_id = auth.uid()
    )
  );

-- INSERT: Create accounts for self (or admin can create for anyone)
CREATE POLICY "insert_accounts_hierarchy"
  ON accounts FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = owner_id
    OR is_admin()
  );

-- UPDATE: Modify own accounts + subordinates' accounts + admin modifies all
CREATE POLICY "update_accounts_hierarchy"
  ON accounts FOR UPDATE
  TO public
  USING (
    is_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id 
      FROM user_hierarchy 
      WHERE manager_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id 
      FROM user_hierarchy 
      WHERE manager_id = auth.uid()
    )
  );

-- ============================================================================
-- PART B: SECURE PROJECTS TABLE
-- ============================================================================

-- Drop existing role-based policies
DROP POLICY IF EXISTS "view_projects_by_role" ON projects;
DROP POLICY IF EXISTS "insert_projects" ON projects;
DROP POLICY IF EXISTS "update_projects_by_role" ON projects;
DROP POLICY IF EXISTS "delete_projects_by_role" ON projects;

-- Apply hierarchical security pattern (same as opportunities)

-- SELECT: View own projects + subordinates' projects + admin sees all
CREATE POLICY "view_projects_hierarchy"
  ON projects FOR SELECT
  TO public
  USING (
    is_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id 
      FROM user_hierarchy 
      WHERE manager_id = auth.uid()
    )
  );

-- INSERT: Create projects for self (or admin can create for anyone)
CREATE POLICY "insert_projects_hierarchy"
  ON projects FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = owner_id
    OR is_admin()
  );

-- UPDATE: Modify own projects + subordinates' projects + admin modifies all
CREATE POLICY "update_projects_hierarchy"
  ON projects FOR UPDATE
  TO public
  USING (
    is_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id 
      FROM user_hierarchy 
      WHERE manager_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
      SELECT subordinate_id 
      FROM user_hierarchy 
      WHERE manager_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: Refresh hierarchy to ensure clean slate
-- ============================================================================

SELECT refresh_user_hierarchy();
