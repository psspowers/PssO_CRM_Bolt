/*
  # Add BESS Column to Opportunities
  
  1. Changes
    - Add `bess` (boolean) to opportunities table
  
  2. Purpose
    - Track whether the opportunity includes Battery Energy Storage Systems
    - Enable seed script to populate BESS information
  
  3. Notes
    - Safe to run multiple times (uses IF NOT EXISTS)
    - Refreshes API cache after changes
    - Default value set to false for existing records
*/

-- Add missing BESS column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS bess boolean DEFAULT false;

-- CRITICAL: Refresh the API Cache
NOTIFY pgrst, 'reload config';