/*
  # Create Storage Bucket for Company Assets

  1. Storage Setup
    - Create `company-assets` bucket for storing company files (logo, documents, etc.)
    - Enable public access for reading files
    - Set file size limit to 5MB
    - Allow image file types (png, jpg, jpeg, svg, webp)

  2. Security
    - Enable RLS on storage.objects
    - Allow public read access to files in company-assets bucket
    - Allow admin users to upload/update/delete files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Public read access to company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete company assets" ON storage.objects;

-- Policy: Allow public read access to company-assets bucket
CREATE POLICY "Public read access to company assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'company-assets');

-- Policy: Allow admin users to upload files
CREATE POLICY "Admin can upload company assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets' AND
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role = 'admin'
    )
  );

-- Policy: Allow admin users to update files
CREATE POLICY "Admin can update company assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-assets' AND
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets' AND
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role = 'admin'
    )
  );

-- Policy: Allow admin users to delete files
CREATE POLICY "Admin can delete company assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-assets' AND
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE crm_users.id = auth.uid()
      AND crm_users.role = 'admin'
    )
  );