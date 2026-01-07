/*
  # Fix Super Admin Access to All Tables

  This migration ensures that super_admin role has visibility into ALL system tables.
  Currently, super_admin is blocked from viewing critical audit and tracking tables.

  ## Changes

  1. **admin_activity_logs**
     - OLD: Only `admin` can view
     - NEW: Both `super_admin` and `admin` can view

  2. **opportunity_stage_history**
     - OLD: Only `admin` and `internal` can view
     - NEW: `super_admin`, `admin`, and `internal` can view

  3. **session_events**
     - OLD: Only `admin` can view all events
     - NEW: Both `super_admin` and `admin` can view all events

  4. **user_entity_connections**
     - OLD: Only `admin` and `internal` can view teammate connections
     - NEW: `super_admin`, `admin`, and `internal` can view teammate connections

  5. **entity_relationships**
     - OLD: Only `admin` and `internal` can view all relationships
     - NEW: `super_admin`, `admin`, and `internal` can view all relationships

  ## Security Notes

  - All policies remain restrictive by default
  - Only authenticated users with appropriate roles can access data
  - External users still only see their own data
  - Super admin now has proper oversight capabilities
*/

-- 1. Fix admin_activity_logs - Add super_admin
DROP POLICY IF EXISTS "Admins can view logs" ON admin_activity_logs;

CREATE POLICY "Super admins and admins can view logs"
  ON admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
        AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- 2. Fix opportunity_stage_history - Add super_admin
DROP POLICY IF EXISTS "View history hierarchy" ON opportunity_stage_history;

CREATE POLICY "View history hierarchy"
  ON opportunity_stage_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
        AND crm_users.role IN ('super_admin', 'admin', 'internal')
    )
  );

-- 3. Fix session_events - Add super_admin to admin policy
DROP POLICY IF EXISTS "Admins can view all session events" ON session_events;

CREATE POLICY "Super admins and admins can view all session events"
  ON session_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
        AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- 4. Fix user_entity_connections - Add super_admin to teammate viewing
DROP POLICY IF EXISTS "Users can view teammate connections" ON user_entity_connections;

CREATE POLICY "Users can view teammate connections"
  ON user_entity_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
        AND crm_users.role IN ('super_admin', 'admin', 'internal')
    )
  );

-- 5. Fix entity_relationships - Add super_admin
DROP POLICY IF EXISTS "Internal users can view all relationships" ON entity_relationships;

CREATE POLICY "Internal users can view all relationships"
  ON entity_relationships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
        AND crm_users.role IN ('super_admin', 'admin', 'internal')
    )
  );
