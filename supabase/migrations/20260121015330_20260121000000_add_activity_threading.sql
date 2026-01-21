/*
  # Add Activity Threading Support

  1. Schema Changes
    - Add `parent_id` column to `activities` table
      - Allows activities to reference a parent activity for threading
      - CASCADE delete ensures replies are removed when parent is deleted
  
  2. Performance
    - Add index on `parent_id` for efficient reply lookups
  
  3. Notes
    - Enables threaded conversations in notes/activities
    - Top-level activities have NULL parent_id
    - Replies reference their parent activity via parent_id
*/

-- Add parent_id column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES activities(id) ON DELETE CASCADE;

-- Create index for efficient parent-child lookups
CREATE INDEX IF NOT EXISTS idx_activities_parent_id ON activities(parent_id);
