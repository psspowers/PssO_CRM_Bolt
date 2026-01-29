/*
  # Add Foreign Key Constraints to Contacts Table

  1. Changes
    - Add foreign key constraint from contacts.account_id → accounts.id
    - Add foreign key constraint from contacts.partner_id → partners_legacy.id (deprecated)
    - Add foreign key constraint from contacts.owner_id → crm_users.id
    
  2. Security
    - No RLS changes needed (already configured)
    
  3. Notes
    - This fixes the Supabase PostgREST query issue where it couldn't find relationships
    - The partner_id FK points to partners_legacy (deprecated table)
    - The account_id is the primary relationship going forward
*/

-- Add foreign key for account_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contacts_account_id_fkey'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_account_id_fkey
      FOREIGN KEY (account_id)
      REFERENCES accounts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for partner_id (legacy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contacts_partner_id_fkey'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_partner_id_fkey
      FOREIGN KEY (partner_id)
      REFERENCES partners_legacy(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for owner_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contacts_owner_id_fkey'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_owner_id_fkey
      FOREIGN KEY (owner_id)
      REFERENCES crm_users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add index on account_id for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);

-- Add index on partner_id for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_partner_id ON contacts(partner_id);

-- Add index on owner_id for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id);
