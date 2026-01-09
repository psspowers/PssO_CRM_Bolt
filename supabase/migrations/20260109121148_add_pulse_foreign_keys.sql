/*
  # Add Foreign Keys for Pulse Screen

  ## Overview
  Adds foreign key relationships between activities, admin_activity_logs, market_news 
  and crm_users table to enable PostgREST joins in the Pulse screen.

  ## Changes
  1. Add foreign key from activities.created_by to crm_users.id
  2. Add foreign key from admin_activity_logs.user_id to crm_users.id  
  3. Update market_news.created_by foreign key to reference crm_users instead of auth.users

  ## Note
  The constraint names must match what the frontend expects for PostgREST joins.
  Orphaned data was cleaned up before applying this migration.
*/

-- Add foreign key from activities.created_by to crm_users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'activities_created_by_fkey'
  ) THEN
    ALTER TABLE activities 
    ADD CONSTRAINT activities_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES crm_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key from admin_activity_logs.user_id to crm_users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_activity_logs_user_id_fkey'
  ) THEN
    ALTER TABLE admin_activity_logs 
    ADD CONSTRAINT admin_activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES crm_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop existing market_news created_by constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'market_news_created_by_fkey' 
    AND table_name = 'market_news'
  ) THEN
    ALTER TABLE market_news DROP CONSTRAINT market_news_created_by_fkey;
  END IF;
END $$;

-- Make created_by nullable
ALTER TABLE market_news ALTER COLUMN created_by DROP NOT NULL;

-- Add foreign key from market_news.created_by to crm_users.id
ALTER TABLE market_news 
ADD CONSTRAINT market_news_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES crm_users(id) ON DELETE SET NULL;