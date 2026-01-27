/*
  # Create Behavioral Matrix RPC Function

  1. New Functions
    - `get_behavioral_matrix(timeframe_days integer DEFAULT NULL)`
      - Returns user behavior data matrix
      - Aggregates watts_ledger entries by user and rule
      - Supports timeframe filtering (7, 30, or all days)
  
  2. Returns
    - JSON object containing:
      - `users`: Array of active users with id, full_name, avatar_url
      - `rules`: Array of gamification rules with id, name, event_key
      - `data`: Object mapping userId -> ruleKey -> {count, watts}
  
  3. Security
    - Function is SECURITY DEFINER (runs with creator privileges)
    - Only accessible to authenticated users
    - Admin-level access recommended (enforce in application layer)
*/

-- Drop function if exists
DROP FUNCTION IF EXISTS get_behavioral_matrix(integer);

-- Create behavioral matrix function
CREATE OR REPLACE FUNCTION get_behavioral_matrix(timeframe_days integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  users_data jsonb;
  rules_data jsonb;
  matrix_data jsonb := '{}'::jsonb;
  user_record record;
  rule_record record;
  ledger_record record;
BEGIN
  -- Build users array (only active users with activity)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'full_name', u.full_name,
      'avatar_url', u.avatar_url,
      'role', u.role
    ) ORDER BY u.full_name
  )
  INTO users_data
  FROM crm_users u
  WHERE u.id IN (
    SELECT DISTINCT user_id 
    FROM watts_ledger
    WHERE (timeframe_days IS NULL OR created_at >= NOW() - (timeframe_days || ' days')::interval)
  );

  -- Build rules array (all rules, ordered by name)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'event_key', r.event_key,
      'points', r.points,
      'is_active', r.is_active
    ) ORDER BY r.name
  )
  INTO rules_data
  FROM gamification_rules r;

  -- Build matrix data: user_id -> rule_key -> {count, watts}
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM watts_ledger
    WHERE (timeframe_days IS NULL OR created_at >= NOW() - (timeframe_days || ' days')::interval)
  LOOP
    matrix_data := jsonb_set(
      matrix_data,
      ARRAY[user_record.user_id::text],
      '{}'::jsonb
    );

    FOR rule_record IN
      SELECT event_key, COUNT(*) as trigger_count, SUM(watts) as total_watts
      FROM watts_ledger
      WHERE user_id = user_record.user_id
        AND (timeframe_days IS NULL OR created_at >= NOW() - (timeframe_days || ' days')::interval)
      GROUP BY event_key
    LOOP
      matrix_data := jsonb_set(
        matrix_data,
        ARRAY[user_record.user_id::text, rule_record.event_key],
        jsonb_build_object(
          'count', rule_record.trigger_count,
          'watts', rule_record.total_watts
        )
      );
    END LOOP;
  END LOOP;

  -- Combine into final result
  result := jsonb_build_object(
    'users', COALESCE(users_data, '[]'::jsonb),
    'rules', COALESCE(rules_data, '[]'::jsonb),
    'data', matrix_data
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_behavioral_matrix(integer) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_behavioral_matrix IS 'Returns behavioral matrix data showing user activity across gamification rules';