/*
  # Add password change required column

  1. Changes
    - Add `password_change_required` column to `crm_users` table
      - Boolean field to track if user needs to change their password
      - Defaults to false for existing users
      - Set to true when admin creates user or resets password
  
  2. Security
    - No RLS changes needed
    - Existing policies continue to apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_users' AND column_name = 'password_change_required'
  ) THEN
    ALTER TABLE crm_users 
    ADD COLUMN password_change_required boolean DEFAULT false NOT NULL;
  END IF;
END $$;
