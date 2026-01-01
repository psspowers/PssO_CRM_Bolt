/*
  # Add linked opportunity to projects table

  1. Changes
    - Add `linked_opportunity_id` column to `projects` table
    - This links projects to the opportunities they originated from
    - Projects should be created from Won opportunities
  
  2. Security
    - No policy changes needed (existing policies remain)
*/

-- Add linked_opportunity_id column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS linked_opportunity_id uuid REFERENCES opportunities(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_linked_opportunity_id ON projects(linked_opportunity_id);