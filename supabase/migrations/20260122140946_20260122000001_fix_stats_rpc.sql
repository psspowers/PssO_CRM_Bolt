/*
  # Fix Commission Rate Calculation in get_my_stats

  1. Changes
    - Expose 'commission_rate_thb_mw' directly from crm_users
    - Calculate commission using explicit rate (won_mw * rate)
    - Prevents divide-by-zero errors for new users with no wins
    - Returns 'rate' field in JSON response for UI calculations

  2. Security
    - SECURITY DEFINER ensures function runs with proper permissions
    - Only returns data for authenticated user (auth.uid())
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
  -- 1. Get User Rate & Quota (Default to 0 if null)
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

  -- 3. Calculate Actual Commission Earned
  v_commission := v_won_mw * v_rate;

  -- 4. Get Watts
  SELECT COALESCE(SUM(amount), 0) INTO v_watts FROM watts_ledger WHERE user_id = v_user_id;
  
  -- 5. Pending Tasks
  SELECT count(*) INTO v_task_count FROM activities 
  WHERE is_task = true AND task_status != 'Completed' AND assigned_to_id = v_user_id;

  RETURN json_build_object(
    'won_mw', v_won_mw,
    'quota_mw', v_quota,
    'commission', v_commission,
    'watts', v_watts,
    'pending_tasks', v_task_count,
    'rate', v_rate
  );
END;
$$;
