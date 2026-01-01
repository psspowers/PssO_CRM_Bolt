/*
  # Add Two-Factor Authentication Support

  1. New Columns in crm_users
    - `two_factor_enabled` (boolean) - Whether 2FA is enabled for the user
    - `two_factor_secret` (text) - Encrypted TOTP secret key for generating codes
    - `backup_codes` (text[]) - Array of encrypted backup codes for account recovery
    - `two_factor_verified_at` (timestamp) - Last successful 2FA verification timestamp

  2. Security
    - All columns are nullable to support gradual 2FA rollout
    - two_factor_enabled defaults to false for new users
    - Secret and backup codes are stored encrypted (app-level encryption required)
    - RLS policies already exist on crm_users table

  3. Notes
    - The secret should be encrypted before storage using app-level encryption
    - Backup codes should be hashed/encrypted and only shown once to user
    - two_factor_verified_at helps with rate limiting and security monitoring
*/

-- Add 2FA columns to crm_users table
DO $$
BEGIN
  -- Add two_factor_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_users' AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE crm_users ADD COLUMN two_factor_enabled boolean DEFAULT false NOT NULL;
  END IF;

  -- Add two_factor_secret column (stores encrypted TOTP secret)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_users' AND column_name = 'two_factor_secret'
  ) THEN
    ALTER TABLE crm_users ADD COLUMN two_factor_secret text;
  END IF;

  -- Add backup_codes column (stores encrypted backup codes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_users' AND column_name = 'backup_codes'
  ) THEN
    ALTER TABLE crm_users ADD COLUMN backup_codes text[];
  END IF;

  -- Add two_factor_verified_at column (tracks last successful verification)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_users' AND column_name = 'two_factor_verified_at'
  ) THEN
    ALTER TABLE crm_users ADD COLUMN two_factor_verified_at timestamptz;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN crm_users.two_factor_enabled IS 'Whether two-factor authentication is enabled for this user';
COMMENT ON COLUMN crm_users.two_factor_secret IS 'Encrypted TOTP secret key (app-level encryption required)';
COMMENT ON COLUMN crm_users.backup_codes IS 'Array of encrypted backup recovery codes';
COMMENT ON COLUMN crm_users.two_factor_verified_at IS 'Last successful 2FA verification timestamp for rate limiting';
