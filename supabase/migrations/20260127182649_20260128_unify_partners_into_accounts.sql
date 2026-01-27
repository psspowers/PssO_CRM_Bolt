/*
  # Merge Partners into Accounts Table

  ## Summary
  This migration consolidates the `partners` table into the `accounts` table to simplify the data model.
  Partners will now be stored as accounts with `type = 'Partner'`.

  ## Changes Made

  1. **Column Mapping**
     - partners.id → accounts.id (preserving UUIDs to maintain all FK relationships)
     - partners.name/company_name → accounts.name (using COALESCE for fallback)
     - partners.region → accounts.state
     - partners.country → accounts.country
     - partners.email → accounts.email
     - partners.phone → accounts.phone
     - partners.clickup_link → accounts.clickup_link
     - partners.notes → accounts.notes
     - partners.pss_orange_owner → accounts.owner_id (primary owner)
     - partners.partner_type → accounts.industry
     - partners.created_at → accounts.created_at
     - Set accounts.type = 'Partner'

  2. **Data Migration**
     - Migrate 16 existing partners to accounts table
     - Preserve all UUIDs to maintain referential integrity
     - Handle conflicts gracefully (skip if ID already exists)

  3. **Foreign Key Updates**
     - Update contacts table: migrate partner_id to organization_id
     - Update opportunities.primary_partner_id FK to point to accounts table
     
  4. **Cleanup**
     - Rename partners table to partners_legacy for archival
     - Keep legacy table for rollback safety

  ## Safety Notes
  - Zero opportunities currently reference partners, so FK migration is safe
  - UUID preservation ensures all existing links remain intact
  - ON CONFLICT handling prevents duplicate key errors
  - Legacy table retained for rollback capability
*/

-- Step 1: Migrate partner data into accounts table
-- Preserve UUIDs to maintain all FK relationships
INSERT INTO accounts (
  id,
  name,
  type,
  country,
  state,
  email,
  phone,
  clickup_link,
  notes,
  owner_id,
  industry,
  created_at,
  updated_at
)
SELECT 
  id,
  COALESCE(company_name, name) as name,
  'Partner' as type,
  country,
  region as state,
  email,
  phone,
  clickup_link,
  notes,
  COALESCE(pss_orange_owner, partner_owner) as owner_id,
  partner_type as industry,
  created_at,
  updated_at
FROM partners
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update contacts table
-- Migrate partner_id references to organization_id (which links to accounts)
UPDATE contacts 
SET 
  organization_id = partner_id,
  organization_type = 'Account'
WHERE partner_id IS NOT NULL 
  AND organization_id IS NULL;

-- Step 3: Update opportunities foreign key
-- Drop existing FK constraint that points to partners table
ALTER TABLE opportunities 
  DROP CONSTRAINT IF EXISTS opportunities_primary_partner_id_fkey;

-- Add new FK constraint pointing to accounts table
ALTER TABLE opportunities 
  ADD CONSTRAINT opportunities_primary_partner_id_fkey 
  FOREIGN KEY (primary_partner_id) 
  REFERENCES accounts(id) 
  ON DELETE SET NULL;

-- Step 4: Archive the partners table
-- Rename to partners_legacy for safety and potential rollback
ALTER TABLE partners RENAME TO partners_legacy;

-- Step 5: Drop FK constraints on legacy table to prevent confusion
ALTER TABLE partners_legacy 
  DROP CONSTRAINT IF EXISTS partners_partner_owner_fkey;

ALTER TABLE partners_legacy 
  DROP CONSTRAINT IF EXISTS partners_pss_orange_owner_fkey;
