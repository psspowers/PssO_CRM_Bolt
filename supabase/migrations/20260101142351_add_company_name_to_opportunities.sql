/*
  # Add Company Name Column to Opportunities
  
  1. Changes
    - Add `company_name` (text) to opportunities table
  
  2. Purpose
    - Store the company name directly on opportunities for easier querying
    - Enable seed script to populate company information
  
  3. Notes
    - Safe to run multiple times (uses IF NOT EXISTS)
    - Refreshes API cache after changes
*/

-- Add missing company_name column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS company_name text;

-- CRITICAL: Refresh the API Cache
NOTIFY pgrst, 'reload config';