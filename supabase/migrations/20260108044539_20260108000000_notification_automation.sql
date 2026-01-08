/*
  # Notification Automation System
  
  This migration creates an automated notification system that generates
  notifications for key business events.

  ## Components Created

  ### A. Helper Function
  - `create_notification()` - Utility function to simplify notification creation
    - Parameters: user_id, type, title, message, entity_id, entity_type
    - Returns: uuid of created notification
    
  ### B. Task Assignment Notifications ("Task Cannon")
  - `notify_on_task_assignment()` - Notifies users when tasks are assigned to them
  - `trigger_notify_task` - Fires on INSERT/UPDATE of activities table
  - Logic: When is_task=true AND assigned_to_id is set to someone else
  
  ### C. Deal Won Notifications ("Victory Bell")
  - `notify_on_deal_won()` - Notifies deal owners when opportunities are won
  - `trigger_notify_won` - Fires on UPDATE of opportunities table
  - Logic: When stage changes from anything to 'Won'
  
  ### D. Nexus Connection Notifications ("Nexus Ping")
  - `notify_on_nexus_link()` - Notifies entity owners when new connections are mapped
  - `trigger_notify_nexus` - Fires on INSERT of relationships table
  - Logic: When relationships are created to Accounts or Contacts
  
  ## Security
  - All notifications respect user_id ownership
  - Uses SECURITY DEFINER for cross-user notification creation
*/

-- ============================================================================
-- PART A: HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_id uuid DEFAULT NULL,
  p_entity_type text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    entity_id,
    entity_type,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_id,
    p_entity_type,
    false,
    now()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- PART B: TASK ASSIGNMENT TRIGGER ("Task Cannon")
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigner_name text;
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
        
        -- Build notification message
        v_notification_title := 'New Task Assigned';
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

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_notify_task ON activities;

CREATE TRIGGER trigger_notify_task
  AFTER INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_task_assignment();

-- ============================================================================
-- PART C: DEAL WON TRIGGER ("Victory Bell")
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
    
    -- Build notification
    v_notification_title := '🎉 Deal Won!';
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

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_notify_won ON opportunities;

CREATE TRIGGER trigger_notify_won
  AFTER INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_deal_won();

-- ============================================================================
-- PART D: NEXUS CONNECTION TRIGGER ("Nexus Ping")
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
      v_notification_title := 'New Connection Mapped';
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

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_notify_nexus ON relationships;

CREATE TRIGGER trigger_notify_nexus
  AFTER INSERT ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_nexus_link();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on the helper function
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_task_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_deal_won TO authenticated;
GRANT EXECUTE ON FUNCTION notify_on_nexus_link TO authenticated;
