/*
  # Upgrade Role System - Granular Admin Permissions

  ## Summary
  This migration implements a 4-tier role system by splitting admin privileges into super_admin and admin roles.

  ## Changes

  ### 1. New Role Hierarchy
  - **super_admin**: Full system access including system settings and seeding (highest privilege)
  - **admin**: Global data visibility but no system configuration capabilities
  - **internal**: Company employees (unchanged)
  - **external**: Partners/Contractors (unchanged)

  ### 2. Database Changes
  - Create `is_admin()` helper function for RLS policies
  - Update CHECK constraint on `crm_users.role` to allow `super_admin`
  - Migrate existing admin user (sam@psspowers.com) to `super_admin` role

  ### 3. Security Model
  - `is_admin()` returns TRUE for both `super_admin` and `admin` (global data access)
  - UI-level enforcement prevents `admin` from accessing system settings
  - Only `super_admin` can assign `super_admin` or `admin` roles

  ## Important Notes
  - RLS policies continue to work with `is_admin()` function
  - UI components will enforce super_admin-only features
  - Org Chart logic remains unchanged (based on reports_to hierarchy)
*/

-- Step 1: Create is_admin() helper function
-- This function returns TRUE if the current authenticated user has admin or super_admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM crm_users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 2: Update CHECK constraint on crm_users.role
-- Drop existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'crm_users' AND constraint_name LIKE '%role%check%'
  ) THEN
    ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS crm_users_role_check;
  END IF;
END $$;

-- Add new constraint with super_admin included
ALTER TABLE crm_users
ADD CONSTRAINT crm_users_role_check
CHECK (role IN ('super_admin', 'admin', 'internal', 'external'));

-- Step 3: Migrate existing admin users to super_admin
-- Specifically migrate sam@psspowers.com
UPDATE crm_users
SET 
  role = 'super_admin',
  updated_at = now()
WHERE email = 'sam@psspowers.com'
AND role = 'admin';

-- Log the migration
DO $$
DECLARE
  updated_count int;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM crm_users
  WHERE role = 'super_admin';
  
  RAISE NOTICE 'Migration complete. % super_admin user(s) configured.', updated_count;
END $$;
