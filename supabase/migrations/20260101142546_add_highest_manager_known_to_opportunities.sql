/*
  # Add Highest Manager Known Column to Opportunities
  
  1. Changes
    - Add `highest_manager_known` (text) to opportunities table
  
  2. Purpose
    - Track the highest level manager/executive known at the opportunity company
    - Important for relationship mapping and sales strategy
  
  3. Notes
    - Safe to run multiple times (uses IF NOT EXISTS)
    - Refreshes API cache after changes
*/

-- Add missing highest_manager_known column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS highest_manager_known text;

-- CRITICAL: Refresh the API Cache
NOTIFY pgrst, 'reload config';