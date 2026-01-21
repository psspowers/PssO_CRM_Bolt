/*
  # Update Notification Header Format

  Updates notification titles to use new format:
  - Market Intel: "Intel - [Deal Name] - MW"
  - Other notifications: "Update - [Deal Name] - MW"

  ## Changes
  1. Updates `notify_deal_owners_on_news()` function for Market Intel
     - Format: "Intel - [Account Name] - MW"
     - Gets account name from related_account_id
  
  2. Updates `notify_on_task_assignment()` for Task notifications
     - Format: "Update - [Related Entity Name] - MW"
     
  3. Updates `notify_on_deal_won()` for Won Deal notifications
     - Format: "Update - [Deal Name] - MW"
     
  4. Updates `notify_on_nexus_link()` for Connection notifications
     - Format: "Update - [Entity Name] - MW"
*/

-- ============================================================================
-- MARKET INTEL NOTIFICATIONS - "Intel - [Account Name] - MW"
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_deal_owners_on_news()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_owner_id uuid;
  v_account_name text;
  v_notification_title text;
BEGIN
  -- Only notify if linked to an account
  IF NEW.related_account_id IS NOT NULL THEN

    -- Get account owner and name
    SELECT owner_id, name INTO v_account_owner_id, v_account_name
    FROM accounts
    WHERE id = NEW.related_account_id;

    -- Check if owner exists and insert notification
    IF v_account_owner_id IS NOT NULL THEN
      -- Format title as "Intel - [Account Name] - MW"
      v_notification_title := 'Intel - ' || COALESCE(v_account_name, 'Unknown Deal') || ' - MW';
      
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        entity_id,
        entity_type
      ) VALUES (
        v_account_owner_id,
        'info',
        v_notification_title,
        NEW.title,
        NEW.id,
        'MarketNews'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TASK ASSIGNMENT NOTIFICATIONS - "Update - [Entity Name] - MW"
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigner_name text;
  v_entity_name text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  -- Only notify on task assignments
  IF NEW.is_task = true AND NEW.assigned_to_id IS NOT NULL THEN
    
    -- Check if this is a new assignment or a change in assignment
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD.assigned_to_id IS NULL OR OLD.assigned_to_id != NEW.assigned_to_id)) THEN
      
      -- Don't notify if assigning to yourself
      IF NEW.assigned_to_id != COALESCE(NEW.created_by_id, NEW.created_by) THEN
        
        -- Get the name of the person who created/assigned the task
        SELECT name INTO v_assigner_name
        FROM crm_users
        WHERE id = COALESCE(NEW.created_by_id, NEW.created_by)
        LIMIT 1;
        
        -- Get related entity name
        IF NEW.related_to_id IS NOT NULL AND NEW.related_to_type IS NOT NULL THEN
          IF NEW.related_to_type = 'Opportunity' THEN
            SELECT name INTO v_entity_name FROM opportunities WHERE id = NEW.related_to_id LIMIT 1;
          ELSIF NEW.related_to_type = 'Account' THEN
            SELECT name INTO v_entity_name FROM accounts WHERE id = NEW.related_to_id LIMIT 1;
          ELSIF NEW.related_to_type = 'Contact' THEN
            SELECT full_name INTO v_entity_name FROM contacts WHERE id = NEW.related_to_id LIMIT 1;
          ELSIF NEW.related_to_type = 'Project' THEN
            SELECT name INTO v_entity_name FROM projects WHERE id = NEW.related_to_id LIMIT 1;
          END IF;
        END IF;
        
        -- Build notification title with new format
        v_notification_title := 'Update - ' || COALESCE(v_entity_name, 'Task') || ' - MW';
        
        -- Build notification message
        v_notification_message := COALESCE(NEW.summary, 'A new task has been assigned to you');
        
        IF v_assigner_name IS NOT NULL THEN
          v_notification_message := v_assigner_name || ' assigned you: ' || v_notification_message;
        END IF;
        
        -- Create the notification
        PERFORM create_notification(
          NEW.assigned_to_id,
          'info',
          v_notification_title,
          v_notification_message,
          NEW.related_to_id,
          NEW.related_to_type
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- DEAL WON NOTIFICATIONS - "Update - [Deal Name] - MW"
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_title text;
  v_notification_message text;
BEGIN
  -- Only notify when deal moves to 'Won' stage
  IF NEW.stage = 'Won' AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM 'Won') THEN
    
    -- Build notification title with new format
    v_notification_title := 'Update - ' || COALESCE(NEW.name, 'Deal') || ' - MW';
    
    -- Build notification message
    v_notification_message := 'Congratulations! "' || COALESCE(NEW.name, 'Your opportunity') || '" has been won. A project has been automatically created.';
    
    -- Notify the opportunity owner
    IF NEW.owner_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.owner_id,
        'success',
        v_notification_title,
        v_notification_message,
        NEW.id,
        'Opportunity'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- NEXUS CONNECTION NOTIFICATIONS - "Update - [Entity Name] - MW"
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_nexus_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_from_name text;
  v_to_name text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  -- Only notify for Account or Contact connections
  IF NEW.to_entity_type IN ('Account', 'Contact') THEN
    
    -- Get the owner of the target entity
    IF NEW.to_entity_type = 'Account' THEN
      SELECT owner_id INTO v_owner_id
      FROM accounts
      WHERE id = NEW.to_entity_id
      LIMIT 1;
      
      -- Get account name
      SELECT name INTO v_to_name
      FROM accounts
      WHERE id = NEW.to_entity_id
      LIMIT 1;
      
    ELSIF NEW.to_entity_type = 'Contact' THEN
      SELECT owner_id INTO v_owner_id
      FROM contacts
      WHERE id = NEW.to_entity_id
      LIMIT 1;
      
      -- Get contact name
      SELECT full_name INTO v_to_name
      FROM contacts
      WHERE id = NEW.to_entity_id
      LIMIT 1;
    END IF;
    
    -- Get the name of the "from" entity
    IF NEW.from_entity_type = 'User' THEN
      SELECT name INTO v_from_name
      FROM crm_users
      WHERE id = NEW.from_entity_id
      LIMIT 1;
    ELSIF NEW.from_entity_type = 'Contact' THEN
      SELECT full_name INTO v_from_name
      FROM contacts
      WHERE id = NEW.from_entity_id
      LIMIT 1;
    ELSIF NEW.from_entity_type = 'Account' THEN
      SELECT name INTO v_from_name
      FROM accounts
      WHERE id = NEW.from_entity_id
      LIMIT 1;
    ELSIF NEW.from_entity_type = 'Partner' THEN
      SELECT name INTO v_from_name
      FROM partners
      WHERE id = NEW.from_entity_id
      LIMIT 1;
    END IF;
    
    -- If we found an owner, notify them
    IF v_owner_id IS NOT NULL THEN
      -- Build notification title with new format
      v_notification_title := 'Update - ' || COALESCE(v_to_name, 'Entity') || ' - MW';
      
      -- Build notification message
      v_notification_message := COALESCE(v_from_name, 'Someone') || ' knows ' || COALESCE(v_to_name, 'your ' || LOWER(NEW.to_entity_type));
      
      -- Add relationship type if available
      IF NEW.type IS NOT NULL THEN
        v_notification_message := v_notification_message || ' (' || NEW.type || ')';
      END IF;
      
      PERFORM create_notification(
        v_owner_id,
        'info',
        v_notification_title,
        v_notification_message,
        NEW.to_entity_id,
        NEW.to_entity_type
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers to use updated functions
DROP TRIGGER IF EXISTS trigger_notify_task ON activities;
CREATE TRIGGER trigger_notify_task
  AFTER INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_task_assignment();

DROP TRIGGER IF EXISTS trigger_notify_won ON opportunities;
CREATE TRIGGER trigger_notify_won
  AFTER INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_deal_won();

DROP TRIGGER IF EXISTS trigger_notify_nexus ON relationships;
CREATE TRIGGER trigger_notify_nexus
  AFTER INSERT ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_nexus_link();

DROP TRIGGER IF EXISTS trigger_notify_news ON market_news;
CREATE TRIGGER trigger_notify_news
  AFTER INSERT ON market_news
  FOR EACH ROW
  EXECUTE FUNCTION notify_deal_owners_on_news();
