-- 1. TRIGGER: Task Completion (+10 Watts)
-- Logic: When a task moves to 'Completed', pay the user.
CREATE OR REPLACE FUNCTION trigger_award_task_completion() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.task_status != 'Completed' AND NEW.task_status = 'Completed' AND NEW.is_task = true THEN
    INSERT INTO watts_ledger (user_id, amount, description, category)
    VALUES (NEW.assigned_to_id, 10, 'Task Completed: ' || COALESCE(NEW.summary, 'Task'), 'Deal');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_complete ON activities;
CREATE TRIGGER on_task_complete
  AFTER UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION trigger_award_task_completion();


-- 2. TRIGGER: Pulse Intel Scout (+20 Watts)
-- Logic: When a user posts NON-NEUTRAL market news (Opportunity/Threat), pay them.
CREATE OR REPLACE FUNCTION trigger_award_pulse_intel() RETURNS TRIGGER AS $$
BEGIN
  -- Only reward manual or analyst posts that are NOT neutral (High Value)
  IF NEW.impact_type != 'neutral' THEN
    INSERT INTO watts_ledger (user_id, amount, description, category)
    VALUES (NEW.created_by, 20, 'Intel Scout: ' || LEFT(NEW.title, 30) || '...', 'Bonus');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pulse_post ON market_news;
CREATE TRIGGER on_pulse_post
  AFTER INSERT ON market_news
  FOR EACH ROW EXECUTE FUNCTION trigger_award_pulse_intel();


-- 3. TRIGGER: The Rainmaker (+100 Watts per MW)
-- Logic: When a deal moves to 'Won', calculate MW * 100.
CREATE OR REPLACE FUNCTION trigger_award_deal_won() RETURNS TRIGGER AS $$
DECLARE
  mw_amount numeric;
  watts_reward int;
BEGIN
  -- Check if stage changed to Won
  IF OLD.stage != 'Won' AND NEW.stage = 'Won' THEN
    mw_amount := COALESCE(NEW.target_capacity, 0);
    watts_reward := CAST(mw_amount * 100 AS INTEGER); -- 100 Watts per MW
    
    -- Cap the reward to prevent inflation (Max 5000 per deal)
    IF watts_reward > 5000 THEN watts_reward := 5000; END IF;
    
    IF watts_reward > 0 THEN
      INSERT INTO watts_ledger (user_id, amount, description, category)
      VALUES (NEW.owner_id, watts_reward, 'Rainmaker: ' || NEW.name || ' (' || mw_amount || 'MW)', 'Deal');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_deal_won ON opportunities;
CREATE TRIGGER on_deal_won
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION trigger_award_deal_won();
