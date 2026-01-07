/*
  # Fix Critical Security Issues - Part 2: RLS Performance Continued

  Optimize remaining RLS policies by wrapping auth.uid() with (select auth.uid())
  This prevents the function from being re-evaluated for each row.
*/

-- ============================================================================
-- accounts table
-- ============================================================================

DROP POLICY IF EXISTS "insert_accounts_hierarchy" ON accounts;
CREATE POLICY "insert_accounts_hierarchy"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
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
      AND role IN ('admin', 'internal')
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
      AND role IN ('admin', 'internal')
    )
  );

-- ============================================================================
-- opportunities table
-- ============================================================================

DROP POLICY IF EXISTS "delete_opportunities_hierarchy" ON opportunities;
CREATE POLICY "delete_opportunities_hierarchy"
  ON opportunities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
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
      AND role IN ('admin', 'internal')
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
        u.role = 'admin'
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
        u.role IN ('admin', 'internal')
        OR (u.role = 'external' AND opportunities.owner_id = u.id)
      )
    )
  );

-- ============================================================================
-- projects table
-- ============================================================================

DROP POLICY IF EXISTS "insert_projects_hierarchy" ON projects;
CREATE POLICY "insert_projects_hierarchy"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
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
        u.role = 'admin'
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
        u.role IN ('admin', 'internal')
        OR (u.role = 'external' AND projects.owner_id = u.id)
      )
    )
  );