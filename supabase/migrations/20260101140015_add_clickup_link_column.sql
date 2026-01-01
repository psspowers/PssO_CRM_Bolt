/*
  # Add ClickUp Link Column to Tables

  1. Changes
    - Add `clickup_link` column to accounts table
    - Add `clickup_link` column to opportunities table
  
  2. Purpose
    - Allows storing ClickUp task/project URLs for each entity
    - Enables integration between CRM and ClickUp project management
    - Optional text field for external task tracking
  
  3. Notes
    - Partners table already has clickup_link column
    - Using IF NOT EXISTS to prevent errors if column already exists
*/

-- 1. Add clickup_link to ACCOUNTS
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS clickup_link text;

-- 2. Add clickup_link to OPPORTUNITIES (Deals)
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS clickup_link text;

-- 3. Force schema cache reload
NOTIFY pgrst, 'reload config';