/*
  # Restore Super Admin Access to All Data

  The previous security migration accidentally removed super_admin from all RLS policies.
  This migration adds super_admin back to all policies so Super Admins can access everything.

  ## Changes
  - Update all RLS policies to check for 'super_admin' role
  - Super Admins get full access to all tables
  - Admins and Internal users maintain their existing access patterns
*/

-- ============================================================================
-- accounts table - Add super_admin to all policies
-- ============================================================================

DROP POLICY IF EXISTS "insert_accounts_hierarchy" ON accounts;
CREATE POLICY "insert_accounts_hierarchy"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );

DROP POLICY IF EXISTS "update_accounts_hierarchy" ON accounts;
CREATE POLICY "update_accounts_hierarchy"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );

DROP POLICY IF EXISTS "view_accounts_hierarchy" ON accounts;
CREATE POLICY "view_accounts_hierarchy"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );

-- ============================================================================
-- opportunities table - Add super_admin to all policies
-- ============================================================================

DROP POLICY IF EXISTS "delete_opportunities_hierarchy" ON opportunities;
CREATE POLICY "delete_opportunities_hierarchy"
  ON opportunities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "insert_opportunities" ON opportunities;
CREATE POLICY "insert_opportunities"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );

DROP POLICY IF EXISTS "update_opportunities_hierarchy" ON opportunities;
CREATE POLICY "update_opportunities_hierarchy"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users u
      WHERE u.id = (select auth.uid())
      AND (
        u.role IN ('super_admin', 'admin')
        OR (u.role = 'internal' AND opportunities.owner_id IN (
          SELECT subordinate_id FROM user_hierarchy WHERE manager_id = u.id
        ))
      )
    )
  );

DROP POLICY IF EXISTS "view_opportunities_hierarchy" ON opportunities;
CREATE POLICY "view_opportunities_hierarchy"
  ON opportunities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users u
      WHERE u.id = (select auth.uid())
      AND (
        u.role IN ('super_admin', 'admin', 'internal')
        OR (u.role = 'external' AND opportunities.owner_id = u.id)
      )
    )
  );

-- ============================================================================
-- projects table - Add super_admin to all policies
-- ============================================================================

DROP POLICY IF EXISTS "insert_projects_hierarchy" ON projects;
CREATE POLICY "insert_projects_hierarchy"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );

DROP POLICY IF EXISTS "update_projects_hierarchy" ON projects;
CREATE POLICY "update_projects_hierarchy"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users u
      WHERE u.id = (select auth.uid())
      AND (
        u.role IN ('super_admin', 'admin')
        OR (u.role = 'internal' AND projects.owner_id IN (
          SELECT subordinate_id FROM user_hierarchy WHERE manager_id = u.id
        ))
      )
    )
  );

DROP POLICY IF EXISTS "view_projects_hierarchy" ON projects;
CREATE POLICY "view_projects_hierarchy"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users u
      WHERE u.id = (select auth.uid())
      AND (
        u.role IN ('super_admin', 'admin', 'internal')
        OR (u.role = 'external' AND projects.owner_id = u.id)
      )
    )
  );

-- ============================================================================
-- partners table - Add super_admin to all policies
-- ============================================================================

DROP POLICY IF EXISTS "delete_partners_by_role" ON partners;
CREATE POLICY "delete_partners_by_role"
  ON partners FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "insert_partners" ON partners;
CREATE POLICY "insert_partners"
  ON partners FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );

DROP POLICY IF EXISTS "update_partners_by_role" ON partners;
CREATE POLICY "update_partners_by_role"
  ON partners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );

DROP POLICY IF EXISTS "view_partners_by_role" ON partners;
CREATE POLICY "view_partners_by_role"
  ON partners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('super_admin', 'admin', 'internal')
    )
  );
