/*
  # Update Partner Regions to S.E.A. Abbreviation

  1. Updates
    - Convert "South East Asia (SEA)" to "S.E.A."
    - Keep "India" as is

  2. Notes
    - This simplifies the regional display name
    - Existing partner data is preserved, only region names are updated
*/

UPDATE partners 
SET region = 'S.E.A.' 
WHERE region = 'South East Asia (SEA)';
