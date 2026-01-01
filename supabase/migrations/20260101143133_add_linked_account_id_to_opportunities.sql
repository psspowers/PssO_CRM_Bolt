/*
  # Add Linked Account ID Column to Opportunities
  
  1. Changes
    - Add `linked_account_id` (uuid) to opportunities table
    - Add foreign key constraint to accounts table
    - Add index for performance
  
  2. Purpose
    - Link opportunities to their related accounts (companies)
    - Ensure data integrity with foreign key constraint
  
  3. Notes
    - Safe to run multiple times (uses IF NOT EXISTS)
    - Refreshes API cache after changes
*/

-- Add missing linked_account_id column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS linked_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_opportunities_linked_account_id 
ON opportunities(linked_account_id);

-- CRITICAL: Refresh the API Cache
NOTIFY pgrst, 'reload config';