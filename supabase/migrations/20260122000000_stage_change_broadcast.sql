/*
  # Stage Change Broadcast to Activity Feed

  1. Purpose
    - Automatically create activity records when opportunity stages change
    - Enable stage changes to appear in the Pulse "For You" feed
    - Track stage progression for visibility and auditing

  2. New Functions
    - `broadcast_stage_change()` - Trigger function that creates activity entries

  3. New Triggers
    - `trigger_broadcast_stage_change` - Fires after opportunity stage updates

  4. Security
    - Function uses SECURITY DEFINER with explicit search_path
    - Attempts to identify the actor from auth.uid()
    - Falls back to opportunity owner if no auth context

  5. Behavior
    - Only creates activity if stage actually changed (IS DISTINCT FROM check)
    - Activity type: 'Stage Change'
    - Automatically links to the opportunity
    - Includes old and new stage in summary
*/

-- Create the trigger function to broadcast stage changes
CREATE OR REPLACE FUNCTION broadcast_stage_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
BEGIN
  -- Only run if stage actually changed
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN

    -- Attempt to identify who made the change (auth.uid)
    -- If triggered by system, fallback to owner or creator
    actor_id := auth.uid();
    IF actor_id IS NULL THEN
      actor_id := NEW.owner_id;
    END IF;

    INSERT INTO activities (
      type,
      summary,
      details,
      related_to_id,
      related_to_type,
      created_by,
      created_at
    ) VALUES (
      'Stage Change',
      'Moved deal from ' || COALESCE(OLD.stage, 'Unknown') || ' to ' || NEW.stage,
      'Automatic system log for stage progression.',
      NEW.id,
      'Opportunity',
      actor_id,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to opportunities table
DROP TRIGGER IF EXISTS trigger_broadcast_stage_change ON opportunities;

CREATE TRIGGER trigger_broadcast_stage_change
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_stage_change();
