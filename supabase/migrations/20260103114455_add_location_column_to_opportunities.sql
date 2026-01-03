/*
  # Add location column to opportunities table

  1. Changes
    - Add `location` column to `opportunities` table
      - Stores specific site names, cities, or geographic locations for the opportunity
      - Nullable text field to support bulk imports with location data
  
  2. Purpose
    - Enable tracking of physical location/site information for opportunities
    - Support bulk import wizard CSV data that includes location field
*/

-- Add location column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS location text;

-- Add comment for documentation
COMMENT ON COLUMN opportunities.location IS 'Geographic location, site name, or city for this opportunity';
