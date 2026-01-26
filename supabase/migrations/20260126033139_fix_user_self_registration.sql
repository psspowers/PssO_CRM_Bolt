/*
  # Fix User Self-Registration During Login

  1. Problem
    - Users who register via auth.users cannot log in because they lack a crm_users profile
    - The current RLS policy only allows admins to INSERT into crm_users
    - When AuthContext.fetchProfile() tries to auto-create a profile, it fails silently

  2. Solution
    - Add RLS policy allowing users to INSERT their own profile (id = auth.uid())
    - Backfill missing crm_users records for confirmed auth users

  3. Security
    - Users can ONLY create their own record (id = auth.uid())
    - Role assignment still follows email-based logic in application
    - Admins can still create records for any user
*/

-- Allow users to create their own profile during first login
CREATE POLICY "Users can create own profile during login"
  ON crm_users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Backfill missing profiles for confirmed users
DO $$
DECLARE
  auth_user RECORD;
  default_role TEXT;
  default_name TEXT;
  default_badges TEXT[];
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN crm_users cu ON au.id = cu.id
    WHERE au.confirmed_at IS NOT NULL
      AND cu.id IS NULL
  LOOP
    -- Determine default role based on email
    IF auth_user.email ILIKE '%@psspowers.com' OR auth_user.email ILIKE '%@ycubeholdings.com' THEN
      default_role := 'internal';
    ELSE
      default_role := 'external';
    END IF;

    -- Generate default name from email
    default_name := INITCAP(SPLIT_PART(auth_user.email, '@', 1));

    -- Default badges (empty for most users)
    default_badges := ARRAY[]::TEXT[];

    -- Insert the missing profile
    INSERT INTO crm_users (id, email, name, role, badges, is_active, avatar)
    VALUES (
      auth_user.id,
      auth_user.email,
      default_name,
      default_role,
      default_badges,
      true,
      'https://ui-avatars.com/api/?name=' || replace(default_name, ' ', '+') || '&background=f97316&color=fff&bold=true'
    );

    RAISE NOTICE 'Created profile for %', auth_user.email;
  END LOOP;
END $$;
