/*
  # Volume-Based Commission System

  1. Schema Changes
    - Add `commission_rate_thb_mw` to crm_users (THB per MW)
    - Add `annual_quota_mw` to crm_users (MW quota)

  2. Functions
    - Update `get_my_stats` to calculate:
      - Earned THB (won MW * rate)
      - Won MW (sum of target_capacity for Won deals)
      - Quota MW
      - Progress percentage

  3. Security
    - Only admins can modify commission rates
    - Users can read their own stats via RPC
*/

ALTER TABLE crm_users
ADD COLUMN IF NOT EXISTS commission_rate_thb_mw numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_quota_mw numeric DEFAULT 0;

CREATE OR REPLACE FUNCTION get_my_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_tasks_count int;
  v_won_mw numeric;
  v_commission_rate numeric;
  v_annual_quota numeric;
  v_earned_thb numeric;
  v_progress_pct numeric;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COUNT(*)
  INTO v_tasks_count
  FROM activities
  WHERE created_by = v_user_id
    AND type = 'task'
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

  SELECT
    COALESCE(SUM(o.target_capacity), 0),
    COALESCE(u.commission_rate_thb_mw, 0),
    COALESCE(u.annual_quota_mw, 0)
  INTO v_won_mw, v_commission_rate, v_annual_quota
  FROM crm_users u
  LEFT JOIN opportunities o ON o.owner_id = u.id
    AND o.stage = 'Won'
    AND EXTRACT(YEAR FROM o.updated_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  WHERE u.id = v_user_id
  GROUP BY u.id, u.commission_rate_thb_mw, u.annual_quota_mw;

  v_earned_thb := v_won_mw * v_commission_rate;

  IF v_annual_quota > 0 THEN
    v_progress_pct := (v_won_mw / v_annual_quota) * 100;
  ELSE
    v_progress_pct := 0;
  END IF;

  RETURN json_build_object(
    'tasks_count', v_tasks_count,
    'earned_thb', v_earned_thb,
    'won_mw', v_won_mw,
    'quota_mw', v_annual_quota,
    'progress_pct', v_progress_pct,
    'commission_rate', v_commission_rate
  );
END;
$$;
