/*
  # Add Google Drive Link to Opportunities

  ## Changes
  1. Adds `google_drive_link` column to opportunities table
     - Stores Google Drive folder/document links for deal documentation
     - Optional text field
     - Allows teams to quickly access centralized deal materials

  ## Impact
  - Users can now store and access Google Drive links for each opportunity
  - Enhances collaboration by providing quick access to deal documentation
*/

-- Add google_drive_link column to opportunities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'google_drive_link'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN google_drive_link text;
  END IF;
END $$;
