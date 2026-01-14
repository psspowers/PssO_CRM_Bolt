/*
  # Fix Market News Notification Trigger

  ## Overview
  Fixes the `notify_deal_owners_on_news()` trigger function that was using
  incorrect column names when inserting notifications.

  ## Changes
  - Update `notify_deal_owners_on_news()` function to use correct column names:
    - `related_to_id` → `entity_id`
    - `related_to_type` → `entity_type`

  ## Impact
  - Fixes CSV import errors in Pulse screen
  - Notifications will now be created correctly when market news is added
*/

-- Fix the notification trigger function to use correct column names
CREATE OR REPLACE FUNCTION notify_deal_owners_on_news() RETURNS TRIGGER AS $$
BEGIN
  -- Find users who have open opportunities with this account
  INSERT INTO notifications (user_id, title, message, type, entity_id, entity_type)
  SELECT
    o.owner_id,
    '🚨 Intel Alert: ' || NEW.title,
    'News affects your deal with ' || a.name,
    'Alert',
    NEW.id,
    'MarketNews'
  FROM opportunities o
  JOIN accounts a ON o.account_id = a.id
  WHERE a.id = NEW.related_account_id
  AND o.stage NOT IN ('Won', 'Lost')
  AND NEW.related_account_id IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
