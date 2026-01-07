/*
  # Fix Critical Security Issues - Part 4: Complete RLS Optimization

  Continue optimizing remaining RLS policies
*/

-- ============================================================================
-- activities table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create activities" ON activities;
CREATE POLICY "Authenticated users can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete activities" ON activities;
CREATE POLICY "Authenticated users can delete activities"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update activities" ON activities;
CREATE POLICY "Authenticated users can update activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view activities" ON activities;
CREATE POLICY "Authenticated users can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- relationships table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create relationships" ON relationships;
CREATE POLICY "Authenticated users can create relationships"
  ON relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete relationships" ON relationships;
CREATE POLICY "Authenticated users can delete relationships"
  ON relationships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update relationships" ON relationships;
CREATE POLICY "Authenticated users can update relationships"
  ON relationships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view relationships" ON relationships;
CREATE POLICY "Authenticated users can view relationships"
  ON relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- system_settings table
-- ============================================================================

DROP POLICY IF EXISTS "Admin can delete system settings" ON system_settings;
CREATE POLICY "Admin can delete system settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert system settings" ON system_settings;
CREATE POLICY "Admin can insert system settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update system settings" ON system_settings;
CREATE POLICY "Admin can update system settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- media_files table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload files" ON media_files;
CREATE POLICY "Authenticated users can upload files"
  ON media_files FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own files" ON media_files;
CREATE POLICY "Users can delete own files"
  ON media_files FOR DELETE
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own files" ON media_files;
CREATE POLICY "Users can update own files"
  ON media_files FOR UPDATE
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view files for entities they own" ON media_files;
CREATE POLICY "Users can view files for entities they own"
  ON media_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own uploaded files" ON media_files;
CREATE POLICY "Users can view own uploaded files"
  ON media_files FOR SELECT
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

-- ============================================================================
-- admin_activity_logs table
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view logs" ON admin_activity_logs;
CREATE POLICY "Admins can view logs"
  ON admin_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

-- ============================================================================
-- opportunity_stage_history table
-- ============================================================================

DROP POLICY IF EXISTS "View history hierarchy" ON opportunity_stage_history;
CREATE POLICY "View history hierarchy"
  ON opportunity_stage_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  );