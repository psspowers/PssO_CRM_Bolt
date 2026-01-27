/*
  # Full Gamification Suite Deployment

  1. Rules Seeding
    - Seeds all gamification rules with specific point values
    - Upserts to prevent duplicates and allow updates

  2. Helper Functions
    - `internal_award_watts()` - Internal function to award points based on rules
    - `log_gamification_event()` - RPC for client-side events (Dig Deeper, Comments, etc.)

  3. Triggers
    - Contact creation (+20 Watts)
    - Nexus link creation (+20 Watts)
    - Pulse favorites (+10 Watts)
    - Activity logging (+10 Watts)
    - Stage moves with anti-yo-yo logic
    - Lazarus bonus (revive stale deals)

  4. Security
    - All functions use SECURITY DEFINER
    - Rule-based point awards
    - First-time stage achievement tracking
*/

-- 1. SEED RULES (Upsert to prevent duplicates)
INSERT INTO gamification_rules (event_key, name, points, multiplier_type, description) VALUES
('LOG_ACTIVITY',   'Log Activity', 10, 'fixed', 'Award for logging calls, meetings, or site visits'),
('ADD_CONTACT',    'Add Contact to Deal', 20, 'fixed', 'Award for adding a contact to an account or opportunity'),
('NEXUS_LINK',     'Add Nexus Connection', 20, 'fixed', 'Award for creating a relationship connection'),
('PULSE_POST',     'Post Market Intel', 30, 'fixed', 'Award for posting market intelligence (non-neutral)'),
('PULSE_FAV',      'Favorite Intel', 10, 'fixed', 'Award for favoriting market news'),
('DIG_DEEPER',     'AI Dig Deeper', 10, 'fixed', 'Award for using AI analysis features'),
('COMMENT',        'Internal Comment', 15, 'fixed', 'Award for adding internal comments'),
('LAZARUS',        'Revive Stale Deal', 50, 'fixed', 'Award for updating deals stale for >30 days'),
('STAGE_QUAL',     'Stage: Qualified', 50, 'fixed', 'Award for moving deal to Qualified stage'),
('STAGE_PROP',     'Stage: Proposal', 100, 'fixed', 'Award for moving deal to Proposal stage'),
('STAGE_NEG',      'Stage: Negotiation', 200, 'fixed', 'Award for moving deal to Negotiation stage'),
('STAGE_TERM',     'Stage: Term Sheet', 300, 'fixed', 'Award for moving deal to Term Sheet stage'),
('DEAL_WON',       'Rainmaker (Deal Won)', 1000, 'per_mw', 'Award for closing deals (1000 Watts per MW)')
ON CONFLICT (event_key) DO UPDATE SET
  points = EXCLUDED.points,
  description = EXCLUDED.description;

-- 2. HELPER FUNCTION: Award Points (Internal)
CREATE OR REPLACE FUNCTION internal_award_watts(
  p_user_id uuid,
  p_rule_key text,
  p_desc text,
  p_ref_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points int;
  v_active boolean;
BEGIN
  -- Lookup rule
  SELECT points, is_active INTO v_points, v_active
  FROM gamification_rules
  WHERE event_key = p_rule_key;

  -- Award if active and points > 0
  IF v_active AND v_points > 0 THEN
    INSERT INTO watts_ledger (user_id, amount, description, category)
    VALUES (p_user_id, v_points, p_desc, 'Deal');
  END IF;
END;
$$;

-- 3. CLIENT-SIDE RPC (For "Dig Deeper" / "Comment" events)
CREATE OR REPLACE FUNCTION log_gamification_event(
  event_type text,
  description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM internal_award_watts(auth.uid(), event_type, description);
END;
$$;

GRANT EXECUTE ON FUNCTION log_gamification_event(text, text) TO authenticated;

-- 4. TRIGGER: CONTACTS (+20)
CREATE OR REPLACE FUNCTION trigger_contact_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only if linked to Account, Partner, or Opportunity
  IF (NEW.organization_id IS NOT NULL OR NEW.partner_id IS NOT NULL) THEN
    PERFORM internal_award_watts(
      COALESCE(NEW.owner_id, auth.uid()),
      'ADD_CONTACT',
      'Added Contact: ' || COALESCE(NEW.full_name, 'Unknown')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contact_added ON contacts;
CREATE TRIGGER on_contact_added
  AFTER INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_contact_added();

-- 5. TRIGGER: NEXUS (+20)
CREATE OR REPLACE FUNCTION trigger_nexus_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM internal_award_watts(
    auth.uid(),
    'NEXUS_LINK',
    'Nexus Connection Created'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_nexus_added ON relationships;
CREATE TRIGGER on_nexus_added
  AFTER INSERT ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_nexus_added();

-- 6. TRIGGER: PULSE FAVORITE (+10)
CREATE OR REPLACE FUNCTION trigger_pulse_fav()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_favorite = true AND (OLD.is_favorite = false OR OLD.is_favorite IS NULL) THEN
    PERFORM internal_award_watts(
      NEW.user_id,
      'PULSE_FAV',
      'Favorited Market Intel'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_pulse_fav ON market_news_interactions;
CREATE TRIGGER on_pulse_fav
  AFTER UPDATE ON market_news_interactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pulse_fav();

-- 7. TRIGGER: ACTIVITY LOGGING (+10)
CREATE OR REPLACE FUNCTION trigger_activity_logged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for non-task activities (calls, meetings, notes)
  IF NEW.is_task = false AND NEW.type IN ('call', 'meeting', 'note', 'site_visit') THEN
    PERFORM internal_award_watts(
      COALESCE(NEW.created_by, NEW.created_by_id, auth.uid()),
      'LOG_ACTIVITY',
      'Activity Logged: ' || COALESCE(NEW.type, 'Unknown')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_activity_logged ON activities;
CREATE TRIGGER on_activity_logged
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_activity_logged();

-- 8. TRIGGER: STAGE MOVES (Smart Anti-Yo-Yo Logic)
CREATE OR REPLACE FUNCTION trigger_stage_move()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule text;
  v_points int;
  v_mw numeric;
  v_is_first_time boolean;
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- A. LAZARUS CHECK (Stale > 30 days)
    IF OLD.updated_at < (NOW() - INTERVAL '30 days') THEN
      PERFORM internal_award_watts(
        COALESCE(NEW.owner_id, auth.uid()),
        'LAZARUS',
        'Lazarus: Revived ' || NEW.name
      );
    END IF;

    -- B. DETERMINE RULE KEY
    v_rule := CASE
      WHEN NEW.stage = 'Qualified' THEN 'STAGE_QUAL'
      WHEN NEW.stage = 'Proposal' THEN 'STAGE_PROP'
      WHEN NEW.stage = 'Negotiation' THEN 'STAGE_NEG'
      WHEN NEW.stage = 'Term Sheet' THEN 'STAGE_TERM'
      ELSE NULL
    END;

    -- C. AWARD IF FIRST TIME (Anti-Yo-Yo)
    IF v_rule IS NOT NULL THEN
      -- Check history: Has this deal EVER been in this stage before?
      SELECT NOT EXISTS (
        SELECT 1 FROM opportunity_stage_history
        WHERE opportunity_id = NEW.id
        AND new_stage = NEW.stage
      ) INTO v_is_first_time;

      IF v_is_first_time THEN
        PERFORM internal_award_watts(
          NEW.owner_id,
          v_rule,
          'Stage Reached: ' || NEW.stage || ' - ' || NEW.name
        );
      END IF;
    END IF;

    -- D. RAINMAKER (Won) - Dynamic per-MW award
    IF NEW.stage = 'Won' AND OLD.stage != 'Won' THEN
       v_mw := COALESCE(NEW.target_capacity, 0);

       -- Fetch dynamic rule points per MW
       SELECT points INTO v_points
       FROM gamification_rules
       WHERE event_key = 'DEAL_WON' AND is_active = true;

       IF v_points > 0 AND v_mw > 0 THEN
         -- Cap at 10,000 Watts to prevent inflation
         INSERT INTO watts_ledger (user_id, amount, description, category)
         VALUES (
           NEW.owner_id,
           LEAST((v_mw * v_points)::int, 10000),
           'Rainmaker: ' || NEW.name || ' (' || v_mw || 'MW)',
           'Deal'
         );
       END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_stage_move ON opportunities;
CREATE TRIGGER on_stage_move
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_stage_move();

-- 9. UPDATE EXISTING PULSE INTEL TRIGGER to use new rule
CREATE OR REPLACE FUNCTION trigger_award_pulse_intel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only reward manual or analyst posts that are NOT neutral (High Value)
  IF NEW.impact_type != 'neutral' THEN
    PERFORM internal_award_watts(
      NEW.created_by,
      'PULSE_POST',
      'Intel Scout: ' || LEFT(NEW.title, 30) || '...'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_pulse_post ON market_news;
CREATE TRIGGER on_pulse_post
  AFTER INSERT ON market_news
  FOR EACH ROW
  EXECUTE FUNCTION trigger_award_pulse_intel();
