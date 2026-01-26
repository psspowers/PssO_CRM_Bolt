/*
  # Fix Duplicate Market News Notification Trigger

  ## Problem
  The `market_news` table has TWO triggers that both call `notify_deal_owners_on_news()`:
  1. `on_market_news_insert` (created Jan 10)
  2. `trigger_notify_news` (created Jan 21)
  
  This causes every market news insert to create DUPLICATE notifications for users.

  ## Root Cause
  Migration 20260121074303 tried to drop `trigger_notify_news` before creating it,
  but the old trigger was named `on_market_news_insert`, so the DROP had no effect.
  Both triggers remained active.

  ## Solution
  Drop the old `on_market_news_insert` trigger, keeping only `trigger_notify_news`.

  ## Impact
  - Eliminates duplicate notifications in the notification box
  - Users will receive only ONE notification per market news item
  - No breaking changes to functionality
*/

-- Drop the old duplicate trigger
DROP TRIGGER IF EXISTS on_market_news_insert ON market_news;

-- Keep only trigger_notify_news (already exists, no need to recreate)
