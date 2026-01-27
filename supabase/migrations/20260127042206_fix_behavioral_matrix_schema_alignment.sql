/*
  # Fix Behavioral Matrix Function - Schema Alignment

  1. Changes
    - Drop and recreate `get_behavioral_matrix()` with corrected schema
    - Use `name` column instead of `full_name`
    - Adds timeframe_days parameter for flexible time filtering
    - Returns proper data structure with count and watts

  2. Function Details
    - Returns aggregated user behavior data for gamification matrix
    - Includes users, rules, and activity counts from watts_ledger
    - Security: DEFINER mode for controlled access
*/

-- Drop existing function variants
DROP FUNCTION IF EXISTS get_behavioral_matrix();
DROP FUNCTION IF EXISTS get_behavioral_matrix(integer);

-- Recreate with corrected schema
CREATE OR REPLACE FUNCTION get_behavioral_matrix(timeframe_days int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_users json;
  v_rules json;
  v_data json;
  v_start_date timestamptz;
  result json;
BEGIN
  -- Handle "All Time" (null)
  IF timeframe_days IS NULL THEN
    v_start_date := '2000-01-01';
  ELSE
    v_start_date := now() - (timeframe_days || ' days')::interval;
  END IF;

  -- 1. Get Users (Use 'name', NOT 'full_name')
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'avatar_url', avatar_url,
      'role', role
    ) ORDER BY name
  ) INTO v_users
  FROM crm_users;

  -- 2. Get Rules
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

  -- 3. Get Data
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

  -- 4. Return
  SELECT json_build_object(
    'users', COALESCE(v_users, '[]'::json),
    'rules', COALESCE(v_rules, '[]'::json),
    'data', COALESCE(v_data, '{}'::json)
  ) INTO result;

  RETURN result;
END;
$$;