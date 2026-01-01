/*
  # Add Notes Column to Tables

  1. Changes
    - Add `notes` column to accounts table
    - Add `notes` column to opportunities table
    - Add `notes` column to partners table (if not exists)
  
  2. Purpose
    - Allows storing additional notes and comments for each entity
    - Provides flexible text field for miscellaneous information
    - Supports better documentation of entities in the CRM
  
  3. Notes
    - Partners table may already have notes column
    - Using IF NOT EXISTS to prevent errors
*/

-- 1. Add notes to ACCOUNTS
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS notes text;

-- 2. Add notes to OPPORTUNITIES (Deals)
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS notes text;

-- 3. Add notes to PARTNERS (if not already exists)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS notes text;

-- 4. Force schema cache reload
NOTIFY pgrst, 'reload config';