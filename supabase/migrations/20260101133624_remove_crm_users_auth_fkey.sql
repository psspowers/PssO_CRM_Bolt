/*
  # Remove Foreign Key Constraint for Shadow Users

  1. Changes
    - Removes foreign key constraint between crm_users.id and auth.users.id
    - Allows "shadow users" to exist in CRM before they have active logins
    - Enables test data seeding with dummy users
  
  2. Security Impact
    - crm_users records can now exist independently of auth.users
    - This is intentional: employees can be added to CRM before account creation
    - RLS policies still protect data access based on authenticated users
  
  3. Notes
    - Fixes seeding error: "violates foreign key constraint crm_users_id_fkey"
    - Supports workflow where HR/Admin adds users before they register
    - Test users (Raj, Priya, etc.) can now be inserted without auth records
*/

-- Remove the foreign key constraint that links crm_users to auth.users
ALTER TABLE crm_users DROP CONSTRAINT IF EXISTS crm_users_id_fkey;