/*
  # Fix Behavioral Matrix Function - Column Reference Bug

  1. Changes
    - Corrects `get_behavioral_matrix()` function to use `name` column instead of `full_name`
    - The crm_users table uses 'name', not 'full_name'
    
  2. Function Details
    - Returns aggregated user behavior data for gamification matrix
    - Includes users, rules, and activity counts from watts_ledger
    - Security: DEFINER mode for controlled access
*/

CREATE OR REPLACE FUNCTION get_behavioral_matrix()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_users json;
  v_rules json;
  v_data json;
  result json;
BEGIN
  -- 1. Get Users (FIX: Use 'name' instead of 'full_name')
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,  -- CORRECTED COLUMN
      'avatar', avatar_url,
      'role', role
    ) ORDER BY name
  ) INTO v_users
  FROM crm_users;

  -- 2. Get Rules
  SELECT json_agg(
    json_build_object(
      'key', event_key,
      'name', name,
      'points', points
    ) ORDER BY name
  ) INTO v_rules
  FROM gamification_rules
  WHERE is_active = true;

  -- 3. Get Data (Aggregated Counts)
  -- We group by user_id and map description patterns to keys
  WITH raw_data AS (
    SELECT 
      user_id,
      CASE 
        WHEN description LIKE 'Task Completed%' THEN 'TASK_COMPLETE' -- Legacy key mapping
        WHEN description LIKE 'Added Contact%' THEN 'ADD_CONTACT'
        WHEN description LIKE 'Nexus Link%' THEN 'NEXUS_LINK'
        WHEN description LIKE 'Intel Scout%' THEN 'PULSE_POST'
        WHEN description LIKE 'Favorited%' THEN 'PULSE_FAV'
        WHEN description LIKE 'Rainmaker%' THEN 'DEAL_WON'
        ELSE category -- Fallback
      END as rule_key,
      SUM(amount) as total_watts,
      COUNT(*) as count
    FROM watts_ledger
    WHERE created_at > (now() - interval '30 days')
    GROUP BY user_id, rule_key
  )
  SELECT json_object_agg(
    user_id,
    (
      SELECT json_object_agg(rule_key, count)
      FROM raw_data sub
      WHERE sub.user_id = root.user_id
    )
  ) INTO v_data
  FROM raw_data root;

  -- 4. Return Composite JSON
  SELECT json_build_object(
    'users', COALESCE(v_users, '[]'::json),
    'rules', COALESCE(v_rules, '[]'::json),
    'data', COALESCE(v_data, '{}'::json)
  ) INTO result;

  RETURN result;
END;
$$;