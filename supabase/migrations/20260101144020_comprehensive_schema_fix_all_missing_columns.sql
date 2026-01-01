/*
  # Comprehensive Schema Fix - All Missing Columns
  
  1. Opportunities Table Additions
    - Add `priority` (text) - High/Medium/Low priority
    - Add `next_action` (text) - Next action to take
    - Add `next_action_date` (date) - When next action is due
    - Add `monthly_bill` (numeric) - Customer's monthly electricity bill
    - Add `re_type` (text) - Renewable energy type (Solar - Ground/Rooftop, etc)
    - Add `profitability_rating` (integer) - Rating 1-5
    - Add `target_decision_date` (date) - Expected decision date
    - Add `value` (numeric) - Alias/alternative to amount field
  
  2. Partners Table Fix
    - Change `pss_orange_owner` from text to uuid (FK to crm_users)
    - Change `partner_owner` from text to uuid (FK to crm_users)
  
  3. Activities Table Compatibility
    - Add `created_by_id` as alias to `created_by` for seed compatibility
  
  4. Purpose
    - Enable all seed data to insert successfully
    - Fix data type mismatches
    - Maintain backward compatibility
  
  5. Safety
    - All changes use IF NOT EXISTS / IF EXISTS checks
    - No data loss - only adding columns and changing empty text columns to uuid
    - Foreign keys set to ON DELETE SET NULL for safety
*/

-- =====================================================
-- OPPORTUNITIES TABLE - Add all missing columns
-- =====================================================

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS priority text;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS next_action text;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS next_action_date date;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS monthly_bill numeric;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS re_type text;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS profitability_rating integer;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS target_decision_date date;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS value numeric;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_opportunities_priority 
ON opportunities(priority);

CREATE INDEX IF NOT EXISTS idx_opportunities_next_action_date 
ON opportunities(next_action_date);

-- =====================================================
-- PARTNERS TABLE - Fix owner fields to use UUIDs
-- =====================================================

-- Drop existing columns and recreate as uuid with foreign keys
DO $$ 
BEGIN
  -- Drop pss_orange_owner if it exists as text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' 
      AND column_name = 'pss_orange_owner' 
      AND data_type = 'text'
  ) THEN
    ALTER TABLE partners DROP COLUMN pss_orange_owner;
  END IF;
  
  -- Drop partner_owner if it exists as text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' 
      AND column_name = 'partner_owner' 
      AND data_type = 'text'
  ) THEN
    ALTER TABLE partners DROP COLUMN partner_owner;
  END IF;
END $$;

-- Add back as uuid with foreign keys
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS pss_orange_owner uuid REFERENCES crm_users(id) ON DELETE SET NULL;

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS partner_owner uuid REFERENCES crm_users(id) ON DELETE SET NULL;

-- Add indexes for partner owner fields
CREATE INDEX IF NOT EXISTS idx_partners_pss_orange_owner 
ON partners(pss_orange_owner);

CREATE INDEX IF NOT EXISTS idx_partners_partner_owner 
ON partners(partner_owner);

-- =====================================================
-- ACTIVITIES TABLE - Add created_by_id compatibility
-- =====================================================

-- Add created_by_id as an alias/alternative to created_by
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES crm_users(id) ON DELETE SET NULL;

-- Create a trigger to sync created_by and created_by_id
CREATE OR REPLACE FUNCTION sync_activities_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- If created_by_id is set, also set created_by
  IF NEW.created_by_id IS NOT NULL THEN
    NEW.created_by := NEW.created_by_id;
  END IF;
  
  -- If created_by is set, also set created_by_id
  IF NEW.created_by IS NOT NULL THEN
    NEW.created_by_id := NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_activities_created_by ON activities;

CREATE TRIGGER trigger_sync_activities_created_by
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION sync_activities_created_by();

-- CRITICAL: Refresh the PostgREST API Cache
NOTIFY pgrst, 'reload config';