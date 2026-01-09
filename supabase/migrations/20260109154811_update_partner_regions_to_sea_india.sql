/*
  # Update Partner Regions to SEA and India

  1. Updates
    - Convert "Southeast Asia" to "South East Asia (SEA)"
    - Convert "Asia Pacific" to "South East Asia (SEA)"
    - Convert "South Asia" to "India"
    - Set NULL regions to "South East Asia (SEA)" as default

  2. Notes
    - This consolidates regional classifications into two main categories
    - Existing partner data is preserved, only region names are updated
*/

UPDATE partners 
SET region = 'South East Asia (SEA)' 
WHERE region IN ('Southeast Asia', 'Asia Pacific') OR region IS NULL;

UPDATE partners 
SET region = 'India' 
WHERE region = 'South Asia';
