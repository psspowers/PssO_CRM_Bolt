/*
  # Create Pulse Engine - Market News & Activity Feed

  1. New Tables
    - `market_news`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `summary` (text, nullable)
      - `url` (text, nullable)
      - `impact_type` (text, enum: opportunity/threat/neutral)
      - `source_type` (text, default: 'Analyst')
      - `related_account_id` (uuid, foreign key to accounts)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `market_news` table
    - Add policy for authenticated users to read all news
    - Add policy for authenticated users to post news

  3. Important Notes
    - Designed for internal analyst workflow with ChatGPT integration
    - CSV import/export bridge for rapid intelligence gathering
    - Links news to accounts for Nexus integration
*/

-- Drop existing table if it exists (for clean deployment)
DROP TABLE IF EXISTS market_news CASCADE;

-- Create market_news table
CREATE TABLE IF NOT EXISTS market_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  url text,
  impact_type text CHECK (impact_type IN ('opportunity', 'threat', 'neutral')),
  source_type text DEFAULT 'Analyst',
  related_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_market_news_account ON market_news(related_account_id);
CREATE INDEX IF NOT EXISTS idx_market_news_created_at ON market_news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_news_impact ON market_news(impact_type);

-- Enable Row Level Security
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Read news" ON market_news;
DROP POLICY IF EXISTS "Write news" ON market_news;
DROP POLICY IF EXISTS "Update own news" ON market_news;
DROP POLICY IF EXISTS "Delete own news" ON market_news;

-- Policy: All authenticated users can read all news
CREATE POLICY "Read news"
  ON market_news
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can post news
CREATE POLICY "Write news"
  ON market_news
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own news
CREATE POLICY "Update own news"
  ON market_news
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own news
CREATE POLICY "Delete own news"
  ON market_news
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
