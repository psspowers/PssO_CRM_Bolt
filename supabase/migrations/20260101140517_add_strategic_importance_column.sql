/*
  # Add Strategic Importance Column to Accounts

  1. Changes
    - Add `strategic_importance` column to accounts table
  
  2. Purpose
    - Allows categorizing accounts by their strategic importance
    - Supports prioritization and filtering of key accounts
    - Enables better account management and focus
  
  3. Notes
    - Using text type for flexibility in storing importance levels
    - Using IF NOT EXISTS to prevent errors
*/

-- 1. Add strategic_importance to ACCOUNTS
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS strategic_importance text;

-- 2. Force schema cache reload
NOTIFY pgrst, 'reload config';