/*
  # Remove Temporary Upload Policy

  1. Changes
    - Remove the temporary public upload policy
    - Only admin users can upload/update/delete files going forward
*/

-- Remove temporary public upload policy
DROP POLICY IF EXISTS "Temporary public upload for initial setup" ON storage.objects;