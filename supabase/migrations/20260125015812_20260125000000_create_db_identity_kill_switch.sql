/*
  # Database Identity Kill Switch
  
  **Purpose**: Prevent silent operation on wrong database
  
  ## What This Does
  Creates a singleton table that identifies this specific database instance.
  The app checks this on startup - if missing or wrong, it refuses to run.
  
  ## Tables
  - `db_identity`
    - `id` (boolean, always true - ensures only one row)
    - `environment` (text, identifies this database)
    - `created_at` (timestamp, audit trail)
  
  ## Security
  - Only one row can ever exist (primary key constraint)
  - App-side check prevents silent data loss
  - No RLS needed - this is infrastructure metadata
  
  ## Recovery
  If app throws "wrong database" error:
  1. Check .env matches .env.ORIGINAL_BACKUP
  2. Restore if different
  3. Restart dev server
*/

-- Create identity table (singleton pattern)
CREATE TABLE IF NOT EXISTS db_identity (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  environment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert the identity (only one row can ever exist)
INSERT INTO db_identity (environment, created_at)
VALUES ('PRODUCTION_ORIGINAL', now())
ON CONFLICT (id) DO NOTHING;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_db_identity_environment ON db_identity(environment);

-- No RLS needed - this is infrastructure metadata
-- But let's add public read access for the check
ALTER TABLE db_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can verify database identity"
  ON db_identity
  FOR SELECT
  TO public
  USING (true);