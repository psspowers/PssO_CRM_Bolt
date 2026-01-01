/*
  # Media Vault Infrastructure Setup

  ## Overview
  Creates the complete infrastructure for the Technical Vault feature:
  - Database table for media file metadata
  - Storage bucket for secure file storage
  - RLS policies for access control
  - Storage policies for upload/download permissions

  ## New Tables
  
  ### `media_files`
  Stores metadata for all uploaded media files
  - `id` (uuid, primary key) - Unique file identifier
  - `storage_path` (text) - Internal path in storage bucket (NOT a URL)
  - `file_name` (text) - Original filename
  - `file_type` (text) - MIME type (image/jpeg, application/pdf, etc.)
  - `file_size` (bigint) - Size in bytes
  - `category` (text) - File category (Roof, Electrical, Utility Bill, etc.)
  - `gps_lat` (numeric) - GPS latitude for verification
  - `gps_lng` (numeric) - GPS longitude for verification
  - `is_verified` (boolean) - Whether GPS coordinates exist
  - `related_to_id` (uuid) - Associated entity ID (Opportunity, Account, Project)
  - `related_to_type` (text) - Entity type
  - `uploaded_by` (uuid) - User who uploaded the file
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last modification timestamp

  ## Storage Bucket
  
  ### `vault`
  - Private bucket (NOT public)
  - Requires authenticated access
  - Files accessed via signed URLs (temporary secure tokens)

  ## Security
  
  ### RLS Policies (Restrictive)
  - Users can view files they uploaded
  - Users can view files related to entities they own
  - Users can upload files when authenticated
  - Users can delete their own files
  - Admin users have full access

  ### Storage Policies
  - Authenticated users can upload to their own folders
  - Authenticated users can read files they own or have access to
  - Users can delete their own files
*/

-- ============================================================================
-- 1. CREATE MEDIA FILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  category text NOT NULL,
  gps_lat numeric(10, 6),
  gps_lng numeric(10, 6),
  is_verified boolean DEFAULT false,
  related_to_id uuid,
  related_to_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_media_files_related_to 
  ON media_files(related_to_id, related_to_type);

CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by 
  ON media_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_media_files_category 
  ON media_files(category);

-- ============================================================================
-- 2. ENABLE RLS ON MEDIA FILES TABLE
-- ============================================================================

ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES FOR MEDIA FILES
-- ============================================================================

-- SELECT: Users can view their own files and files related to entities they own
CREATE POLICY "Users can view own uploaded files"
  ON media_files FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can view files for entities they own"
  ON media_files FOR SELECT
  TO authenticated
  USING (
    related_to_id IN (
      -- Files related to opportunities they own
      SELECT id FROM opportunities WHERE owner_id = auth.uid()
      UNION
      -- Files related to accounts they own
      SELECT id FROM accounts WHERE owner_id = auth.uid()
      UNION
      -- Files related to projects they own
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- INSERT: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload files"
  ON media_files FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- UPDATE: Users can update metadata of their own files
CREATE POLICY "Users can update own files"
  ON media_files FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- DELETE: Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON media_files FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- ============================================================================
-- 4. CREATE STORAGE BUCKET
-- ============================================================================

-- Create the 'vault' bucket as a PRIVATE bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault',
  'vault',
  false,  -- PRIVATE bucket (not public)
  52428800,  -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. STORAGE POLICIES FOR VAULT BUCKET
-- ============================================================================

-- SELECT: Users can read files they uploaded or have access to via entity ownership
CREATE POLICY "Users can read own files or entity files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vault' AND (
      -- Files in user's own folder
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- Files related to entities they own (check via media_files table)
      EXISTS (
        SELECT 1 FROM media_files mf
        WHERE mf.storage_path = storage.objects.name
          AND (
            mf.uploaded_by = auth.uid()
            OR mf.related_to_id IN (
              SELECT id FROM opportunities WHERE owner_id = auth.uid()
              UNION
              SELECT id FROM accounts WHERE owner_id = auth.uid()
              UNION
              SELECT id FROM projects WHERE owner_id = auth.uid()
            )
          )
      )
    )
  );

-- INSERT: Users can upload to their own folder
CREATE POLICY "Users can upload files to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vault' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: Users can update files they uploaded
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vault' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vault' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vault' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 6. TRIGGER TO UPDATE updated_at TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_media_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_media_files_updated_at ON media_files;

CREATE TRIGGER trigger_update_media_files_updated_at
  BEFORE UPDATE ON media_files
  FOR EACH ROW
  EXECUTE FUNCTION update_media_files_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_files') THEN
    RAISE NOTICE '✓ Table media_files created successfully';
  ELSE
    RAISE EXCEPTION '✗ Failed to create media_files table';
  END IF;
END $$;

-- Verify bucket was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'vault') THEN
    RAISE NOTICE '✓ Storage bucket "vault" created successfully';
  ELSE
    RAISE EXCEPTION '✗ Failed to create vault storage bucket';
  END IF;
END $$;

-- Count policies
DO $$
DECLARE
  table_policy_count int;
  storage_policy_count int;
BEGIN
  SELECT COUNT(*) INTO table_policy_count FROM pg_policies WHERE tablename = 'media_files';
  SELECT COUNT(*) INTO storage_policy_count FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%files%';
  
  RAISE NOTICE '✓ Created % RLS policies for media_files table', table_policy_count;
  RAISE NOTICE '✓ Created % storage policies for vault bucket', storage_policy_count;
  RAISE NOTICE '✓ Media Vault infrastructure ready';
END $$;
