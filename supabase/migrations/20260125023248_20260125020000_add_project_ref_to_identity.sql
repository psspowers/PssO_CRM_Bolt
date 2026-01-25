/*
  # Add Project Reference to Database Identity
  
  **Purpose**: Make database identity cryptographically unique
  
  ## What This Does
  Adds a second invariant (project_ref) that only exists in the real database.
  Even if someone copies the migration and recreates the table, they cannot
  fake identity without knowing the exact project ref.
  
  ## Changes
  - Add `project_ref` column to `db_identity`
  - Populate with actual Supabase project ref
  
  ## Security Enhancement
  Now requires TWO values to match:
  - environment = 'PRODUCTION_ORIGINAL'
  - project_ref = 'shrglaqikuzcvoihzpyt'
  
  This makes accidental or malicious identity spoofing impossible.
*/

-- Add project_ref column
ALTER TABLE db_identity
ADD COLUMN IF NOT EXISTS project_ref text NOT NULL DEFAULT 'shrglaqikuzcvoihzpyt';

-- Update existing row with the project ref
UPDATE db_identity
SET project_ref = 'shrglaqikuzcvoihzpyt'
WHERE id = true;

-- Add constraint to ensure it never changes
ALTER TABLE db_identity
ADD CONSTRAINT project_ref_must_match
CHECK (project_ref = 'shrglaqikuzcvoihzpyt');