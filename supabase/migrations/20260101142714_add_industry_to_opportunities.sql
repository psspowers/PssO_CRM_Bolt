/*
  # Add Industry Column to Opportunities
  
  1. Changes
    - Add `industry` (text) to opportunities table
  
  2. Purpose
    - Categorize opportunities by industry sector
    - Enable filtering and reporting by industry
  
  3. Notes
    - Safe to run multiple times (uses IF NOT EXISTS)
    - Refreshes API cache after changes
*/

-- Add missing industry column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS industry text;

-- CRITICAL: Refresh the API Cache
NOTIFY pgrst, 'reload config';