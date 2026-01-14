/*
  # Fix Ambiguous Column Reference in News Notification Trigger

  ## Problem
  The trigger function `notify_deal_owners_on_news` has a variable named `owner_id`
  that conflicts with the `owner_id` column in the `accounts` table, causing
  PostgreSQL to throw "column reference 'owner_id' is ambiguous" error.

  ## Solution
  Rename the variable from `owner_id` to `v_account_owner_id` following the
  industry standard `v_` prefix convention for PL/pgSQL variables.

  ## Benefits
  1. Eliminates variable shadowing (PostgreSQL confusion)
  2. Future-proof against additional JOINs with owner_id columns
  3. Improves code readability for developers
  4. Follows PostgreSQL best practices

  ## Impact
  - CSV imports to market_news will now succeed
  - Notifications will be created correctly for account owners
  - No breaking changes to existing functionality
*/

CREATE OR REPLACE FUNCTION notify_deal_owners_on_news()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_owner_id uuid; -- Renamed variable to prevent collision
BEGIN
  -- Only notify if linked to an account
  IF NEW.related_account_id IS NOT NULL THEN

    -- Select the owner using the new variable name
    SELECT owner_id INTO v_account_owner_id
    FROM accounts
    WHERE id = NEW.related_account_id;

    -- Check if owner exists and insert notification
    IF v_account_owner_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        entity_id,
        entity_type
      ) VALUES (
        v_account_owner_id, -- Use the variable
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