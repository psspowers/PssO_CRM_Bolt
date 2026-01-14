/*
  # Simplified Market News Notification Trigger

  ## Overview
  Replaces the complex trigger with a simpler version that only notifies
  the account owner when market news is added.

  ## Changes
  - Notifies account owner (not all deal owners)
  - Uses correct column names: entity_id and entity_type
  - Cleaner, more maintainable code

  ## Impact
  - Account owners get notified when news affects their accounts
  - Reduced notification noise (only owner, not all deal owners)
*/

CREATE OR REPLACE FUNCTION notify_deal_owners_on_news()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  -- Only notify if linked to an account
  IF NEW.related_account_id IS NOT NULL THEN
    -- Find the account owner
    SELECT owner_id INTO owner_id
    FROM accounts
    WHERE id = NEW.related_account_id;
    
    IF owner_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        entity_id,
        entity_type
      ) VALUES (
        owner_id,
        'info',
        'New Market Intel',
        NEW.title,
        NEW.id,
        'MarketNews'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
