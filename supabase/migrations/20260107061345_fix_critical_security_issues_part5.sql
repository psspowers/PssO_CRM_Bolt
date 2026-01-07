/*
  # Fix Critical Security Issues - Part 5: Final RLS Optimizations

  Complete RLS policy optimization for remaining tables
*/

-- ============================================================================
-- entity_relationships table
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create relationships" ON entity_relationships;
CREATE POLICY "Authenticated users can create relationships"
  ON entity_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Creator or admin can delete relationships" ON entity_relationships;
CREATE POLICY "Creator or admin can delete relationships"
  ON entity_relationships FOR DELETE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Creator or admin can update relationships" ON entity_relationships;
CREATE POLICY "Creator or admin can update relationships"
  ON entity_relationships FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "External users can view their own relationships" ON entity_relationships;
CREATE POLICY "External users can view their own relationships"
  ON entity_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users u
      WHERE u.id = (select auth.uid())
      AND u.role = 'external'
      AND (
        entity_relationships.from_entity_id = u.id
        OR entity_relationships.to_entity_id = u.id
      )
    )
  );

DROP POLICY IF EXISTS "Internal users can view all relationships" ON entity_relationships;
CREATE POLICY "Internal users can view all relationships"
  ON entity_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  );

-- ============================================================================
-- relationship_interaction_log table
-- ============================================================================

DROP POLICY IF EXISTS "Users can create interaction logs" ON relationship_interaction_log;
CREATE POLICY "Users can create interaction logs"
  ON relationship_interaction_log FOR INSERT
  TO authenticated
  WITH CHECK (
    logged_by = (select auth.uid())
  );

-- ============================================================================
-- user_entity_connections table
-- ============================================================================

DROP POLICY IF EXISTS "Users can create own connections" ON user_entity_connections;
CREATE POLICY "Users can create own connections"
  ON user_entity_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own connections" ON user_entity_connections;
CREATE POLICY "Users can delete own connections"
  ON user_entity_connections FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own connections" ON user_entity_connections;
CREATE POLICY "Users can update own connections"
  ON user_entity_connections FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own connections" ON user_entity_connections;
CREATE POLICY "Users can view own connections"
  ON user_entity_connections FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view teammate connections" ON user_entity_connections;
CREATE POLICY "Users can view teammate connections"
  ON user_entity_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role IN ('admin', 'internal')
    )
  );

-- ============================================================================
-- session_events table
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all session events" ON session_events;
CREATE POLICY "Admins can view all session events"
  ON session_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = (select auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own session events" ON session_events;
CREATE POLICY "Users can view own session events"
  ON session_events FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));