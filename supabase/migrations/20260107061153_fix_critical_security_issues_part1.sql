/*
  # Fix Critical Security Issues - Part 1: Indexes and RLS Performance

  1. Missing Foreign Key Indexes
    - Add indexes for unindexed foreign keys to improve query performance
    - entity_relationships.created_by
    - opportunity_stage_history.opportunity_id
    - opportunity_stage_history.user_id
    - relationship_interaction_log.logged_by

  2. Remove Duplicate Index
    - Drop idx_media_files_related (duplicate of idx_media_files_related_to)

  3. Fix RLS Performance Issues
    - Wrap all auth.uid() calls with (select auth.uid())
    - This prevents re-evaluation for each row, drastically improving performance
*/

-- ============================================================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_entity_relationships_created_by 
  ON entity_relationships(created_by);

CREATE INDEX IF NOT EXISTS idx_opportunity_stage_history_opportunity_id 
  ON opportunity_stage_history(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_stage_history_user_id 
  ON opportunity_stage_history(user_id);

CREATE INDEX IF NOT EXISTS idx_relationship_interaction_log_logged_by 
  ON relationship_interaction_log(logged_by);

-- ============================================================================
-- PART 2: Remove Duplicate Index
-- ============================================================================

DROP INDEX IF EXISTS idx_media_files_related;

-- ============================================================================
-- PART 3: Fix RLS Performance - Optimize auth.uid() calls
-- ============================================================================

-- crm_users table
DROP POLICY IF EXISTS "Users can update own profile" ON crm_users;
CREATE POLICY "Users can update own profile"
  ON crm_users FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- login_history table
DROP POLICY IF EXISTS "Insert history" ON login_history;
CREATE POLICY "Insert history"
  ON login_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Read own history" ON login_history;
CREATE POLICY "Read own history"
  ON login_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- trusted_devices table
DROP POLICY IF EXISTS "Read own devices" ON trusted_devices;
CREATE POLICY "Read own devices"
  ON trusted_devices FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own devices" ON trusted_devices;
CREATE POLICY "Users can update own devices"
  ON trusted_devices FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- notifications table
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));