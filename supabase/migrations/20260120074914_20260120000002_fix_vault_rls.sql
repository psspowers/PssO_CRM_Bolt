/*
  # Fix Vault Storage RLS Policies

  ## Problem
  - Current INSERT policy requires uploads to path: `vault/{user_id}/...`
  - Application code uploads to: `vault/{entityType}/{entityId}/...`
  - Result: All uploads are blocked by RLS policy violation

  ## Solution
  Replace restrictive user-folder policies with team-friendly policies that:
  - Allow authenticated users to upload anywhere in vault
  - Allow authenticated users to read any file in vault
  - Allow authenticated users to delete files in vault
  - Path organization is controlled by frontend code

  ## Changes
  1. DROP restrictive INSERT policy
  2. CREATE team-friendly INSERT policy
  3. DROP restrictive SELECT policy
  4. CREATE team-friendly SELECT policy
  5. DROP restrictive DELETE policy
  6. CREATE team-friendly DELETE policy
  7. DROP restrictive UPDATE policy
  8. CREATE team-friendly UPDATE policy

  ## Security Notes
  - RLS still protects the bucket (only authenticated users have access)
  - Fine-grained permissions can be added later via the media_files table
  - Frontend controls path organization and access logic
*/

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can upload files to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files or entity files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- 2. Create team-friendly INSERT policy
CREATE POLICY "Allow team uploads to vault"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vault');

-- 3. Create team-friendly SELECT policy
CREATE POLICY "Allow team reads from vault"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'vault');

-- 4. Create team-friendly UPDATE policy
CREATE POLICY "Allow team updates in vault"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vault')
  WITH CHECK (bucket_id = 'vault');

-- 5. Create team-friendly DELETE policy
CREATE POLICY "Allow team deletes from vault"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'vault');