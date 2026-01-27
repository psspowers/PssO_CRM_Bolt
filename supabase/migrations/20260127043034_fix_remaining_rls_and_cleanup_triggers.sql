/*
  # Fix Remaining RLS Policies and Clean Up Duplicate Triggers

  1. Fix remaining policies that still use auth.uid() without select wrapper
  2. Remove duplicate triggers (old versions without proper args)
  3. Clean up old function versions without search_path
*/

-- Fix crm_users "Users can update own profile"
DROP POLICY IF EXISTS "Users can update own profile" ON crm_users;
CREATE POLICY "Users can update own profile"
  ON crm_users FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Re-apply admin_activity_logs policy
DROP POLICY IF EXISTS "Super admins and admins can view logs" ON admin_activity_logs;
CREATE POLICY "Super admins and admins can view logs"
  ON admin_activity_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- Re-apply gamification_rules policy
DROP POLICY IF EXISTS "Admins can edit rules" ON gamification_rules;
CREATE POLICY "Admins can edit rules"
  ON gamification_rules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- Re-apply market_news policies
DROP POLICY IF EXISTS "Users can delete own market news, admins can delete all" ON market_news;
CREATE POLICY "Users can delete own market news, admins can delete all"
  ON market_news FOR DELETE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update own market news, admins can update all" ON market_news;
CREATE POLICY "Users can update own market news, admins can update all"
  ON market_news FOR UPDATE TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- Re-apply media_files policies
DROP POLICY IF EXISTS "Team members can delete media files" ON media_files;
CREATE POLICY "Team members can delete media files"
  ON media_files FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role != 'external'
    )
  );

DROP POLICY IF EXISTS "Team members can update media files" ON media_files;
CREATE POLICY "Team members can update media files"
  ON media_files FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role != 'external'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role != 'external'
    )
  );

-- Re-apply watts_ledger policies
DROP POLICY IF EXISTS "Super admins can delete watts transactions" ON watts_ledger;
CREATE POLICY "Super admins can delete watts transactions"
  ON watts_ledger FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can update watts transactions" ON watts_ledger;
CREATE POLICY "Super admins can update watts transactions"
  ON watts_ledger FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role = 'super_admin'
    )
  );

-- Drop duplicate triggers (keep the wrappers, remove direct calls)
DROP TRIGGER IF EXISTS trigger_task_watts ON activities;
DROP TRIGGER IF EXISTS trigger_deal_watts ON opportunities;

-- Clean up old function versions without search_path (now safe to drop)
DROP FUNCTION IF EXISTS award_task_completion();
DROP FUNCTION IF EXISTS award_deal_won();