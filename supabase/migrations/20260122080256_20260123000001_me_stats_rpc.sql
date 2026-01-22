/*
  # Personal Stats RPC Function

  1. New Functions
    - `get_my_stats()` - Returns personal performance metrics for the authenticated user
      - Won MW (this year)
      - Annual Quota MW
      - Estimated Commission (THB)
      - Watts Balance
      - Pending Tasks Count

  2. Security
    - Function uses SECURITY DEFINER to access data
    - Only returns data for auth.uid() (authenticated user)
    - Granted to authenticated role
*/

CREATE OR REPLACE FUNCTION get_my_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rate numeric;
  v_quota numeric;
  v_won_mw numeric;
  v_commission numeric;
  v_watts int;
  v_task_count int;
BEGIN
  -- 1. Get User Rate & Quota
  SELECT COALESCE(commission_rate_thb_mw, 0), COALESCE(annual_quota_mw, 0)
  INTO v_rate, v_quota
  FROM crm_users WHERE id = v_user_id;

  -- 2. Calculate Won MW (This Year)
  SELECT COALESCE(SUM(target_capacity), 0)
  INTO v_won_mw
  FROM opportunities
  WHERE owner_id = v_user_id
  AND stage = 'Won'
  AND updated_at >= date_trunc('year', now());

  -- 3. Calculate Commission
  v_commission := v_won_mw * v_rate;

  -- 4. Get Watts (if watts_ledger table exists)
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_watts
    FROM watts_ledger
    WHERE user_id = v_user_id;
  EXCEPTION
    WHEN undefined_table THEN
      v_watts := 0;
  END;

  -- 5. Pending Tasks
  SELECT count(*) INTO v_task_count
  FROM activities
  WHERE is_task = true
  AND task_status != 'Completed'
  AND assigned_to_id = v_user_id;

  RETURN json_build_object(
    'won_mw', v_won_mw,
    'quota_mw', v_quota,
    'commission', v_commission,
    'watts', v_watts,
    'pending_tasks', v_task_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_stats() TO authenticated;