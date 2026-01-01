/*
  # Enforce Single Super Admin Policy

  1. Security Changes
    - Ensures only sam@psspowers.com has admin role
    - Downgrades all other admin users to 'internal' role
    - Updates badges to remove admin privileges from non-super-admin users
  
  2. Updates
    - Promotes sam@psspowers.com to admin (if not already)
    - Demotes all other admin accounts to internal
    - Clears admin badges from demoted users
  
  3. Notes
    - This enforces the single super admin security policy
    - All @psspowers.com and @ycubeholdings.com emails remain 'internal'
    - External users remain 'external'
*/

-- Ensure sam@psspowers.com is the super admin
UPDATE crm_users 
SET 
  role = 'admin',
  name = 'Sam Yamdagni',
  badges = ARRAY['Founder', 'CEO', 'Admin']
WHERE email = 'sam@psspowers.com';

-- Demote all other admin users to internal
UPDATE crm_users 
SET 
  role = 'internal',
  badges = ARRAY[]::text[]
WHERE role = 'admin' 
  AND email != 'sam@psspowers.com';