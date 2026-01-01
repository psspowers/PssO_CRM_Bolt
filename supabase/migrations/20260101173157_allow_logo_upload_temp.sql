/*
  # Temporary policy for logo upload

  1. Changes
    - Add temporary policy to allow upsert of logo file
    - Will be removed after upload completes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Temporary: Allow logo upload'
  ) THEN
    CREATE POLICY "Temporary: Allow logo upload"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (
        bucket_id = 'company-assets' 
        AND name = 'pss_orange_logo.png'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Temporary: Allow logo update'
  ) THEN
    CREATE POLICY "Temporary: Allow logo update"
      ON storage.objects
      FOR UPDATE
      TO public
      USING (
        bucket_id = 'company-assets' 
        AND name = 'pss_orange_logo.png'
      )
      WITH CHECK (
        bucket_id = 'company-assets' 
        AND name = 'pss_orange_logo.png'
      );
  END IF;
END $$;
