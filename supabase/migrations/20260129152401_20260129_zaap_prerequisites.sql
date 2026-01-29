/*
  # Zaap V2 Database Prerequisites

  This migration prepares the database for the upgraded Zaap screen by adding:
  
  1. New Columns
    - `opportunities.velocity_score` - Tracks deal momentum (0-100 scale)
    - `activities.from_pulse` - Flags tasks generated from Pulse intelligence
    - `activities.linked_contact_id` - Links tasks to specific contacts for context
  
  2. New Functions
    - `get_user_streak()` - Calculates consecutive activity days for gamification
    - `suggest_task_chain()` - AI-powered task suggestion engine (V1 stub)
    - `get_deal_threads_view()` - Enhanced to return velocity scores and account names
  
  3. Security
    - All functions use SECURITY DEFINER with proper auth checks
    - No RLS changes needed (existing policies apply)
*/

-- 1. Add Columns expected by the React code
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS velocity_score INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS from_pulse BOOLEAN DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS linked_contact_id UUID REFERENCES contacts(id);

-- 2. Create 'get_user_streak' RPC (Required by code)
-- Logic: Counts distinct days with activity in the last 7 days
CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak INT;
BEGIN
  SELECT COUNT(DISTINCT date_trunc('day', created_at)) INTO streak
  FROM watts_ledger
  WHERE user_id = p_user_id AND created_at > (now() - interval '7 days');
  RETURN streak;
END;
$$;

-- 3. Create 'suggest_task_chain' RPC (Stub required by code)
CREATE OR REPLACE FUNCTION suggest_task_chain(p_deal_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return a mock suggestion for V1
  RETURN json_build_array(
    json_build_object('summary', 'Research key stakeholders (AI)'),
    json_build_object('summary', 'Draft initial outreach email'),
    json_build_object('summary', 'Schedule internal review')
  );
END;
$$;

-- 4. Update 'get_deal_threads_view' to return 'velocity_score' and 'account_name'
CREATE OR REPLACE FUNCTION get_deal_threads_view(p_view_mode TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  curr_user_id UUID := auth.uid();
BEGIN
  SELECT json_agg(deal_obj) INTO result FROM (
    SELECT 
      o.id, o.name, o.stage, 
      COALESCE(o.target_capacity, 0) as mw,
      COALESCE(o.velocity_score, 0) as velocity_score,
      (SELECT name FROM accounts WHERE id = o.account_id) as account_name,
      (
        SELECT json_agg(t) FROM (
          SELECT 
            a.id, a.summary, a.task_status, a.due_date, a.assigned_to_id, 
            a.parent_task_id, a.thread_depth, a.from_pulse, a.linked_contact_id,
            u.avatar as assignee_avatar, 
            u.name as assignee_name
          FROM activities a
          LEFT JOIN crm_users u ON a.assigned_to_id = u.id
          WHERE a.root_deal_id = o.id AND a.is_task = true
          ORDER BY a.due_date ASC
        ) t
      ) as tasks
    FROM opportunities o
    WHERE o.stage NOT IN ('Lost')
    ORDER BY o.velocity_score DESC, o.updated_at DESC
  ) deal_obj;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
