/*
  # Feed Interactions (Polymorphic)

  1. New Tables
    - `feed_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `entity_id` (uuid, polymorphic ID - can reference activities or admin_activity_logs)
      - `entity_type` (text, 'activity' or 'log' to identify the source table)
      - `is_starred` (boolean, tracks bookmarked/important feed items)
      - `is_hidden` (boolean, tracks hidden items from user's feed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - UNIQUE constraint on (user_id, entity_id, entity_type) to prevent duplicate interactions

  2. Security
    - Enable RLS on `feed_interactions` table
    - Users can only SELECT their own interaction records
    - Users can only INSERT their own interaction records
    - Users can only UPDATE their own interaction records
    - Users can only DELETE their own interaction records

  3. Purpose
    - Enables personalized feed curation across multiple entity types
    - Allows users to star/bookmark important internal activity updates
    - Allows users to hide noise without affecting other users' feeds
    - Supports task creation from any feed item
    - Works with polymorphic data from activities and admin_activity_logs
*/

-- Create the feed_interactions table
CREATE TABLE IF NOT EXISTS feed_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('activity', 'log')),
  is_starred boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_id, entity_type)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_feed_interactions_user_id ON feed_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_interactions_entity ON feed_interactions(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_feed_interactions_user_entity ON feed_interactions(user_id, entity_id, entity_type);

-- Enable RLS
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own interactions
CREATE POLICY "Users can view own feed interactions"
  ON feed_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own interactions
CREATE POLICY "Users can create own feed interactions"
  ON feed_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own interactions
CREATE POLICY "Users can update own feed interactions"
  ON feed_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own interactions
CREATE POLICY "Users can delete own feed interactions"
  ON feed_interactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feed_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS feed_interactions_updated_at ON feed_interactions;
CREATE TRIGGER feed_interactions_updated_at
  BEFORE UPDATE ON feed_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_interactions_updated_at();
