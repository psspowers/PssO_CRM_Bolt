/*
  # Fix Behavioral Matrix Function - Avatar Column Name

  1. Changes
    - Use `avatar` column instead of `avatar_url`
    - The crm_users table uses 'avatar', not 'avatar_url'

  2. Function Details
    - Corrects the column reference in get_behavioral_matrix()
*/

-- Drop and recreate with corrected avatar column
DROP FUNCTION IF EXISTS get_behavioral_matrix(integer);

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

  -- 1. Get Users (Use 'avatar', NOT 'avatar_url')
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'avatar_url', avatar,
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