/*
  # Remove temporary logo upload policies

  1. Changes
    - Drop temporary policies used for one-time logo upload
*/

DROP POLICY IF EXISTS "Temporary: Allow logo upload" ON storage.objects;
DROP POLICY IF EXISTS "Temporary: Allow logo update" ON storage.objects;
