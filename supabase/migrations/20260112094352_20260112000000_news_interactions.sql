/*
  # Market News Interactions

  1. New Tables
    - `market_news_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `news_id` (uuid, references market_news)
      - `is_favorite` (boolean, tracks starred/favorited items)
      - `is_hidden` (boolean, tracks hidden items from user's view)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - UNIQUE constraint on (user_id, news_id) to prevent duplicate interactions

  2. Security
    - Enable RLS on `market_news_interactions` table
    - Users can only SELECT their own interaction records
    - Users can only INSERT their own interaction records
    - Users can only UPDATE their own interaction records
    - Users can only DELETE their own interaction records

  3. Purpose
    - Enables personalized news feed experiences
    - Allows users to favorite/star important news items
    - Allows users to hide irrelevant news without affecting others
    - Provides foundation for task creation from news items
*/

-- Create the market_news_interactions table
CREATE TABLE IF NOT EXISTS market_news_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  news_id uuid NOT NULL REFERENCES market_news(id) ON DELETE CASCADE,
  is_favorite boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, news_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_market_news_interactions_user_id ON market_news_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_market_news_interactions_news_id ON market_news_interactions(news_id);
CREATE INDEX IF NOT EXISTS idx_market_news_interactions_user_news ON market_news_interactions(user_id, news_id);

-- Enable RLS
ALTER TABLE market_news_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own interactions
CREATE POLICY "Users can view own interactions"
  ON market_news_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own interactions
CREATE POLICY "Users can create own interactions"
  ON market_news_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own interactions
CREATE POLICY "Users can update own interactions"
  ON market_news_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own interactions
CREATE POLICY "Users can delete own interactions"
  ON market_news_interactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_market_news_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS market_news_interactions_updated_at ON market_news_interactions;
CREATE TRIGGER market_news_interactions_updated_at
  BEFORE UPDATE ON market_news_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_market_news_interactions_updated_at();