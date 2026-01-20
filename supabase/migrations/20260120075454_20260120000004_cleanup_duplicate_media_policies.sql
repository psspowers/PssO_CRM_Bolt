/*
  # Cleanup Duplicate Media Files Policies

  ## Problem
  - Previous migration added new team-friendly policies
  - Old restrictive policies from earlier migrations still exist
  - Multiple policies create confusion and potential conflicts

  ## Solution
  Remove all old restrictive policies to ensure only team-friendly policies remain

  ## Changes
  1. DROP all old restrictive policies
  2. Verify only team-friendly policies remain

  ## Security Notes
  - Only authenticated users can access media_files
  - Team-friendly policies enable collaboration
  - uploaded_by column tracks ownership for audit purposes
*/

-- Drop old restrictive policies that weren't caught in previous migration
DROP POLICY IF EXISTS "Users can delete own files" ON media_files;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON media_files;
DROP POLICY IF EXISTS "Users can view files for entities they own" ON media_files;
DROP POLICY IF EXISTS "Users can view own uploaded files" ON media_files;
DROP POLICY IF EXISTS "Users can update own files" ON media_files;

-- Verify the column default is set
ALTER TABLE media_files 
  ALTER COLUMN uploaded_by 
  SET DEFAULT auth.uid();