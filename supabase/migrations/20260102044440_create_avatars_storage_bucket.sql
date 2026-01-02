/*
  # Create Avatars Storage Bucket

  1. New Storage Bucket
    - `avatars` bucket with public access enabled
    - Allows users to upload and manage their profile pictures

  2. Security Policies
    - Public read access for all avatars
    - Authenticated users can upload avatars
    - Users can only update/delete their own avatars (organized by user ID folder)

  3. Notes
    - Avatars are stored in user-specific folders: avatars/{user_id}/filename
    - This ensures users cannot overwrite each other's avatars
    - Public access allows avatars to be displayed without authentication
*/

-- 1. Create the 'avatars' bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Access to view avatars
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 3. Allow Authenticated Users to Upload their own avatar
DROP POLICY IF EXISTS "Avatar Upload Access" ON storage.objects;
CREATE POLICY "Avatar Upload Access" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

-- 4. Allow Users to Update/Delete their own avatar
DROP POLICY IF EXISTS "Avatar Update Access" ON storage.objects;
CREATE POLICY "Avatar Update Access" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Avatar Delete Access" ON storage.objects;
CREATE POLICY "Avatar Delete Access" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
