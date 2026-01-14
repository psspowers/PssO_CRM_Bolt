/*
  # Convert re_type to Array for Multi-Selection Support

  1. Schema Changes
    - Convert `opportunities.re_type` from `text` to `text[]`
    - Migrate existing single values to array format
    - Set default to empty array
  
  2. Data Migration
    - Existing NULL values → empty array `{}`
    - Existing single values (e.g., 'Solar') → single-item array `{'Solar'}`
    - Preserves all existing data during conversion
  
  3. Rationale
    - Enables hybrid project types (e.g., Solar + BESS)
    - Maintains backward compatibility during migration
    - Allows empty selection (no type specified yet)
*/

-- Convert re_type column from text to text[] array
ALTER TABLE opportunities 
ALTER COLUMN re_type TYPE text[] 
USING CASE 
  WHEN re_type IS NULL THEN '{}'::text[]
  ELSE ARRAY[re_type]::text[]
END;

-- Set default to empty array for new opportunities
ALTER TABLE opportunities 
ALTER COLUMN re_type SET DEFAULT '{}'::text[];