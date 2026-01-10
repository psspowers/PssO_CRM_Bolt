/*
  # Pulse Engine Upgrade - Drip Feed & Smart Actions

  1. Schema Changes
    - Add `published_at` column to `market_news` for drip-feed scheduling
    - Create `market_news_favorites` table for user bookmarks
    
  2. Security
    - Enable RLS on favorites table
    - Users can only manage their own favorites
    
  3. Trigger
    - Auto-notify deal owners when news affects their accounts
*/

-- Add published_at column for drip feed
ALTER TABLE market_news ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

-- Create Favorites table
CREATE TABLE IF NOT EXISTS market_news_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  news_id UUID REFERENCES market_news(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, news_id)
);

-- RLS for Favorites
ALTER TABLE market_news_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites" ON market_news_favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Smart Notification Trigger: Notify deal owners when news affects their accounts
CREATE OR REPLACE FUNCTION notify_deal_owners_on_news() RETURNS TRIGGER AS $$
BEGIN
  -- Find users who have open opportunities with this account
  INSERT INTO notifications (user_id, title, message, type, related_to_id, related_to_type)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_market_news_insert
  AFTER INSERT ON market_news
  FOR EACH ROW
  EXECUTE FUNCTION notify_deal_owners_on_news();