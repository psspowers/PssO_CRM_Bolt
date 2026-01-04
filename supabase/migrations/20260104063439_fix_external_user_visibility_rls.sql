/*
  # Fix External User Data Visibility - Row Level Security

  ## Overview
  This migration restricts data visibility for external users to only show data they own or are related to.
  Internal users and admins continue to see all data.

  ## Changes Made
  
  ### 1. Accounts Table RLS
  - External users can only see accounts linked to opportunities they own
  - Internal users and admins can see all accounts
  
  ### 2. Partners Table RLS
  - External users can only see partners linked to opportunities they own
  - Internal users and admins can see all partners
  
  ### 3. Projects Table RLS  
  - External users can only see projects from opportunities they won
  - Internal users and admins can see all projects

  ## Security Notes
  - Opportunities already have proper hierarchy-based RLS
  - This ensures external users stay focused on their own deals
  - Maintains data segregation between external partners
*/

-- Drop existing overly-permissive RLS policies for accounts
DROP POLICY IF EXISTS "Authenticated users can view accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can create accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can update accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can delete accounts" ON accounts;

-- Create new RLS policies for accounts that respect user roles
CREATE POLICY "view_accounts_by_role"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
    OR
    id IN (
      SELECT DISTINCT linked_account_id
      FROM opportunities
      WHERE owner_id = auth.uid()
      AND linked_account_id IS NOT NULL
    )
  );

CREATE POLICY "insert_accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "update_accounts_by_role"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
    OR
    id IN (
      SELECT DISTINCT linked_account_id
      FROM opportunities
      WHERE owner_id = auth.uid()
      AND linked_account_id IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
    OR
    id IN (
      SELECT DISTINCT linked_account_id
      FROM opportunities
      WHERE owner_id = auth.uid()
      AND linked_account_id IS NOT NULL
    )
  );

CREATE POLICY "delete_accounts_by_role"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin')
    )
  );

-- Drop existing overly-permissive RLS policies for partners
DROP POLICY IF EXISTS "Authenticated users can view partners" ON partners;
DROP POLICY IF EXISTS "Authenticated users can create partners" ON partners;
DROP POLICY IF EXISTS "Authenticated users can update partners" ON partners;
DROP POLICY IF EXISTS "Authenticated users can delete partners" ON partners;

-- Create new RLS policies for partners that respect user roles
CREATE POLICY "view_partners_by_role"
  ON partners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
    OR
    id IN (
      SELECT DISTINCT opp_partners.partner_id
      FROM opportunity_partners opp_partners
      INNER JOIN opportunities opps ON opps.id = opp_partners.opportunity_id
      WHERE opps.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_partners"
  ON partners FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
  );

CREATE POLICY "update_partners_by_role"
  ON partners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
  );

CREATE POLICY "delete_partners_by_role"
  ON partners FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin')
    )
  );

-- Drop existing overly-permissive RLS policies for projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- Create new RLS policies for projects that respect user roles
CREATE POLICY "view_projects_by_role"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
    OR
    linked_opportunity_id IN (
      SELECT id
      FROM opportunities
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "update_projects_by_role"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
    OR
    linked_opportunity_id IN (
      SELECT id
      FROM opportunities
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin', 'internal')
    )
    OR
    linked_opportunity_id IN (
      SELECT id
      FROM opportunities
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_projects_by_role"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role IN ('admin', 'super_admin')
    )
  );
