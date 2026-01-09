/*
  # Create Market News Table for Pulse Intelligence

  ## Overview
  Creates the market_news table to store market intelligence, news, and insights
  that can be imported via CSV or posted by analysts.

  ## New Tables
  - `market_news`
    - `id` (uuid, primary key) - Unique identifier
    - `title` (text, required) - News headline
    - `summary` (text, nullable) - Detailed description or analysis
    - `url` (text, nullable) - Source link
    - `impact_type` (text, required) - Classification: 'opportunity', 'threat', or 'neutral'
    - `source_type` (text, required) - Origin of intel: 'Analyst', 'Automated', etc.
    - `related_account_id` (uuid, nullable) - Links to accounts table
    - `created_by` (uuid, required) - User who created the entry
    - `created_at` (timestamptz) - Timestamp of creation
    - `updated_at` (timestamptz) - Timestamp of last update

  ## Security
  - Enable RLS on market_news table
  - Authenticated users can view all market news
  - Only creators and admins can update/delete their entries
  - All authenticated users can insert new entries

  ## Indexes
  - Index on created_at for time-based queries
  - Index on impact_type for filtering
  - Index on related_account_id for account associations
*/

-- Create market_news table
CREATE TABLE IF NOT EXISTS market_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  url text,
  impact_type text NOT NULL DEFAULT 'neutral' CHECK (impact_type IN ('opportunity', 'threat', 'neutral')),
  source_type text NOT NULL DEFAULT 'Analyst',
  related_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_news_created_at ON market_news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_news_impact_type ON market_news(impact_type);
CREATE INDEX IF NOT EXISTS idx_market_news_related_account ON market_news(related_account_id);
CREATE INDEX IF NOT EXISTS idx_market_news_created_by ON market_news(created_by);

-- Enable RLS
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view market news
CREATE POLICY "Authenticated users can view all market news"
  ON market_news
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert market news
CREATE POLICY "Authenticated users can create market news"
  ON market_news
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own entries, admins can update all
CREATE POLICY "Users can update own market news, admins can update all"
  ON market_news
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR 
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE crm_users.id = auth.uid() 
      AND crm_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = created_by 
    OR 
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE crm_users.id = auth.uid() 
      AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- Policy: Users can delete their own entries, admins can delete all
CREATE POLICY "Users can delete own market news, admins can delete all"
  ON market_news
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR 
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE crm_users.id = auth.uid() 
      AND crm_users.role IN ('super_admin', 'admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_market_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_market_news_updated_at_trigger
  BEFORE UPDATE ON market_news
  FOR EACH ROW
  EXECUTE FUNCTION update_market_news_updated_at();