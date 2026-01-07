/*
  # Fix Critical Security Issues - Part 3: More RLS Performance Optimizations

  Continue optimizing RLS policies with (select auth.uid())
*/

-- ============================================================================
-- partners table
-- ============================================================================

DROP POLICY IF EXISTS "delete_partners_by_role" ON partners;
CREATE POLICY "delete_partners_by_role"
  ON partners FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
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
      AND role IN ('admin', 'internal')
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
      AND role IN ('admin', 'internal')
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
      AND role IN ('admin', 'internal')
    )
  );

-- ============================================================================
-- account_partners table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage account_partners" ON account_partners;
CREATE POLICY "Authenticated users can manage account_partners"
  ON account_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view account_partners" ON account_partners;
CREATE POLICY "Authenticated users can view account_partners"
  ON account_partners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- opportunity_partners table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage opportunity_partners" ON opportunity_partners;
CREATE POLICY "Authenticated users can manage opportunity_partners"
  ON opportunity_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view opportunity_partners" ON opportunity_partners;
CREATE POLICY "Authenticated users can view opportunity_partners"
  ON opportunity_partners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- project_partners table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can manage project_partners" ON project_partners;
CREATE POLICY "Authenticated users can manage project_partners"
  ON project_partners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view project_partners" ON project_partners;
CREATE POLICY "Authenticated users can view project_partners"
  ON project_partners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- contacts table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create contacts" ON contacts;
CREATE POLICY "Authenticated users can create contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON contacts;
CREATE POLICY "Authenticated users can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update contacts" ON contacts;
CREATE POLICY "Authenticated users can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view contacts" ON contacts;
CREATE POLICY "Authenticated users can view contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );