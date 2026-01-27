/*
  # Fix Security and Performance Issues

  1. Add Missing Indexes on Foreign Keys
  2. Fix RLS Auth Initialization Performance
  3. Fix RLS Policies Always True
  4. Fix Function Search Path Security
*/

-- ==========================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_activities_assigned_to_id ON activities(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by_fkey ON activities(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user_id ON admin_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_market_news_favorites_news_id ON market_news_favorites(news_id);

-- ==========================================
-- 2. FIX RLS AUTH INITIALIZATION PERFORMANCE
-- ==========================================

-- crm_users
DROP POLICY IF EXISTS "Users can create own profile during login" ON crm_users;
CREATE POLICY "Users can create own profile during login"
  ON crm_users FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- admin_activity_logs
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

-- opportunity_stage_history
DROP POLICY IF EXISTS "View history hierarchy" ON opportunity_stage_history;
CREATE POLICY "View history hierarchy"
  ON opportunity_stage_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users u
      LEFT JOIN user_hierarchy h ON h.manager_id = (select auth.uid())
      WHERE (select auth.uid()) = u.id
      AND (
        u.role IN ('super_admin', 'admin')
        OR opportunity_stage_history.user_id = (select auth.uid())
        OR h.subordinate_id = opportunity_stage_history.user_id
      )
    )
  );

-- entity_relationships
DROP POLICY IF EXISTS "Internal users can view all relationships" ON entity_relationships;
CREATE POLICY "Internal users can view all relationships"
  ON entity_relationships FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role != 'external'
    )
  );

-- user_entity_connections
DROP POLICY IF EXISTS "Users can view teammate connections" ON user_entity_connections;
CREATE POLICY "Users can view teammate connections"
  ON user_entity_connections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_hierarchy
      WHERE user_hierarchy.manager_id = (select auth.uid())
      AND user_hierarchy.subordinate_id = user_entity_connections.user_id
    )
  );

-- session_events
DROP POLICY IF EXISTS "Super admins and admins can view all session events" ON session_events;
CREATE POLICY "Super admins and admins can view all session events"
  ON session_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = (select auth.uid())
      AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- market_news
DROP POLICY IF EXISTS "Authenticated users can create market news" ON market_news;
CREATE POLICY "Authenticated users can create market news"
  ON market_news FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

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
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- market_news_favorites
DROP POLICY IF EXISTS "Users manage own favorites" ON market_news_favorites;
CREATE POLICY "Users manage own favorites"
  ON market_news_favorites FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- market_news_interactions
DROP POLICY IF EXISTS "Users can create own interactions" ON market_news_interactions;
CREATE POLICY "Users can create own interactions"
  ON market_news_interactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own interactions" ON market_news_interactions;
CREATE POLICY "Users can delete own interactions"
  ON market_news_interactions FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own interactions" ON market_news_interactions;
CREATE POLICY "Users can update own interactions"
  ON market_news_interactions FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own interactions" ON market_news_interactions;
CREATE POLICY "Users can view own interactions"
  ON market_news_interactions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- feed_interactions
DROP POLICY IF EXISTS "Users can create own feed interactions" ON feed_interactions;
CREATE POLICY "Users can create own feed interactions"
  ON feed_interactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own feed interactions" ON feed_interactions;
CREATE POLICY "Users can delete own feed interactions"
  ON feed_interactions FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own feed interactions" ON feed_interactions;
CREATE POLICY "Users can update own feed interactions"
  ON feed_interactions FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own feed interactions" ON feed_interactions;
CREATE POLICY "Users can view own feed interactions"
  ON feed_interactions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- watts_ledger
DROP POLICY IF EXISTS "Super admins can delete watts transactions" ON watts_ledger;
CREATE POLICY "Super admins can delete watts transactions"
  ON watts_ledger FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can update watts transactions" ON watts_ledger;
CREATE POLICY "Super admins can update watts transactions"
  ON watts_ledger FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own watts transactions" ON watts_ledger;
CREATE POLICY "Users can view own watts transactions"
  ON watts_ledger FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- gamification_rules
DROP POLICY IF EXISTS "Admins can edit rules" ON gamification_rules;
CREATE POLICY "Admins can edit rules"
  ON gamification_rules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- ==========================================
-- 3. FIX RLS POLICIES ALWAYS TRUE
-- ==========================================

DROP POLICY IF EXISTS "Allow team deletes on media_files" ON media_files;
DROP POLICY IF EXISTS "Allow team inserts on media_files" ON media_files;
DROP POLICY IF EXISTS "Allow team updates on media_files" ON media_files;

CREATE POLICY "Team members can insert media files"
  ON media_files FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role != 'external'
    )
  );

CREATE POLICY "Team members can update media files"
  ON media_files FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role != 'external'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role != 'external'
    )
  );

CREATE POLICY "Team members can delete media files"
  ON media_files FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role != 'external'
    )
  );

DROP POLICY IF EXISTS "System can award watts" ON watts_ledger;
CREATE POLICY "System can award watts"
  ON watts_ledger FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users WHERE crm_users.id = (select auth.uid()) AND crm_users.role IN ('super_admin', 'admin', 'internal')
    )
  );

-- ==========================================
-- 4. FIX FUNCTION SEARCH PATH SECURITY
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_award_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.task_status = 'completed' AND (OLD.task_status IS NULL OR OLD.task_status != 'completed') THEN
    PERFORM award_task_completion(NEW.id, NEW.assigned_to_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_award_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.stage = 'Won' AND OLD.stage != 'Won' THEN
    PERFORM award_deal_won(NEW.id, NEW."ownerId");
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION award_task_completion(task_id uuid, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rule gamification_rules%ROWTYPE;
BEGIN
  SELECT * INTO v_rule
  FROM gamification_rules
  WHERE event_key = 'TASK_COMPLETE' AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO watts_ledger (user_id, amount, category, description, metadata)
    VALUES (
      user_id,
      v_rule.points,
      'achievement',
      'Task Completed',
      jsonb_build_object('task_id', task_id, 'rule_id', v_rule.id)
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION award_deal_won(opportunity_id uuid, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rule gamification_rules%ROWTYPE;
  v_capacity numeric;
BEGIN
  SELECT * INTO v_rule
  FROM gamification_rules
  WHERE event_key = 'DEAL_WON' AND is_active = true
  LIMIT 1;

  SELECT "targetCapacity" INTO v_capacity
  FROM opportunities
  WHERE id = opportunity_id;

  IF FOUND AND v_rule.id IS NOT NULL THEN
    INSERT INTO watts_ledger (user_id, amount, category, description, metadata)
    VALUES (
      user_id,
      v_rule.points,
      'achievement',
      'Rainmaker: Deal Won',
      jsonb_build_object(
        'opportunity_id', opportunity_id,
        'rule_id', v_rule.id,
        'capacity_mw', v_capacity
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_behavioral_matrix(timeframe_days int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_users json;
  v_rules json;
  v_data json;
  v_start_date timestamptz;
  result json;
BEGIN
  IF timeframe_days IS NULL THEN
    v_start_date := '2000-01-01';
  ELSE
    v_start_date := now() - (timeframe_days || ' days')::interval;
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'avatar_url', avatar,
      'role', role
    ) ORDER BY name
  ) INTO v_users
  FROM crm_users;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'event_key', event_key,
      'name', name,
      'points', points,
      'is_active', is_active
    ) ORDER BY name
  ) INTO v_rules
  FROM gamification_rules
  WHERE is_active = true;

  WITH raw_data AS (
    SELECT
      user_id,
      CASE
        WHEN description ILIKE 'Task Completed%' THEN 'TASK_COMPLETE'
        WHEN description ILIKE 'Added Contact%' THEN 'ADD_CONTACT'
        WHEN description ILIKE 'Nexus Link%' THEN 'NEXUS_LINK'
        WHEN description ILIKE 'Intel Scout%' THEN 'PULSE_POST'
        WHEN description ILIKE 'Favorited%' THEN 'PULSE_FAV'
        WHEN description ILIKE 'Rainmaker%' THEN 'DEAL_WON'
        ELSE category
      END as rule_key,
      SUM(amount) as total_watts,
      COUNT(*) as count
    FROM watts_ledger
    WHERE created_at > v_start_date
    GROUP BY user_id, rule_key
  )
  SELECT json_object_agg(
    user_id,
    (
      SELECT json_object_agg(rule_key, json_build_object('count', count, 'watts', total_watts))
      FROM raw_data sub
      WHERE sub.user_id = root.user_id
    )
  ) INTO v_data
  FROM raw_data root;

  SELECT json_build_object(
    'users', COALESCE(v_users, '[]'::json),
    'rules', COALESCE(v_rules, '[]'::json),
    'data', COALESCE(v_data, '{}'::json)
  ) INTO result;

  RETURN result;
END;
$$;