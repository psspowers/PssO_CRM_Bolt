/*
  # Temporary Public Upload Policy

  1. Changes
    - Add temporary policy to allow public uploads to company-assets bucket
    - This will be used for initial logo upload
    - Should be removed after initial setup
*/

-- Temporary policy: Allow anyone to upload to company-assets for initial setup
CREATE POLICY "Temporary public upload for initial setup"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'company-assets');