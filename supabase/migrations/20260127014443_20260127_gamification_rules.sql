-- 1. Create the Rules Table
CREATE TABLE IF NOT EXISTS gamification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text UNIQUE NOT NULL, -- e.g., 'TASK_COMPLETE'
  name text NOT NULL,
  description text,
  points integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  multiplier_type text DEFAULT 'fixed', -- 'fixed' or 'per_mw'
  updated_at timestamptz DEFAULT now()
);

-- 2. Seed Default Rules (The Strategy)
INSERT INTO gamification_rules (event_key, name, points, multiplier_type) VALUES
('TASK_COMPLETE', 'Task Completion', 10, 'fixed'),
('PULSE_INTEL', 'Market Intel Scout', 20, 'fixed'),
('NEXUS_LINK', 'Nexus Connection', 15, 'fixed'),
('DEAL_WON', 'Rainmaker (Deal Won)', 100, 'per_mw')
ON CONFLICT (event_key) DO NOTHING;

-- 3. Enable RLS (Admin Only Edit, Everyone Read)
ALTER TABLE gamification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read rules" ON gamification_rules FOR SELECT USING (true);
CREATE POLICY "Admins can edit rules" ON gamification_rules FOR ALL USING (
  (SELECT role FROM crm_users WHERE id = auth.uid()) IN ('super_admin', 'admin')
);

-- 4. REWRITE TRIGGERS TO USE DYNAMIC VALUES

-- A. Task Trigger (Dynamic)
CREATE OR REPLACE FUNCTION award_task_completion() RETURNS TRIGGER AS $$
DECLARE
  rule_points int;
  rule_active boolean;
BEGIN
  -- Lookup Rule
  SELECT points, is_active INTO rule_points, rule_active 
  FROM gamification_rules WHERE event_key = 'TASK_COMPLETE';

  -- Only award if Rule is Active and Task is Completed
  IF rule_active AND OLD.task_status != 'Completed' AND NEW.task_status = 'Completed' AND NEW.is_task = true THEN
    INSERT INTO watts_ledger (user_id, amount, description, category)
    VALUES (NEW.assigned_to_id, rule_points, 'Task Completed: ' || COALESCE(NEW.summary, 'Task'), 'Deal');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Deal Won Trigger (Dynamic Multiplier)
CREATE OR REPLACE FUNCTION award_deal_won() RETURNS TRIGGER AS $$
DECLARE
  rule_points int;
  rule_active boolean;
  mw_amount numeric;
  total_reward int;
BEGIN
  SELECT points, is_active INTO rule_points, rule_active 
  FROM gamification_rules WHERE event_key = 'DEAL_WON';

  IF rule_active AND OLD.stage != 'Won' AND NEW.stage = 'Won' THEN
    mw_amount := COALESCE(NEW.target_capacity, 0);
    total_reward := CAST(mw_amount * rule_points AS INTEGER);
    
    -- Safety Cap (Hardcoded 5000 for safety, or add to rules table later)
    IF total_reward > 5000 THEN total_reward := 5000; END IF;

    IF total_reward > 0 THEN
      INSERT INTO watts_ledger (user_id, amount, description, category)
      VALUES (NEW.owner_id, total_reward, 'Rainmaker: ' || NEW.name || ' (' || mw_amount || 'MW)', 'Deal');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach triggers (Task and Deal)
DROP TRIGGER IF EXISTS trigger_task_watts ON activities;
CREATE TRIGGER trigger_task_watts AFTER UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION award_task_completion();

DROP TRIGGER IF EXISTS trigger_deal_watts ON opportunities;
CREATE TRIGGER trigger_deal_watts AFTER UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION award_deal_won();
