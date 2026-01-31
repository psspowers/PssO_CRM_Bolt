/*
  # Add Engagement Fields to Activities

  1. Changes
    - Add `reactions` JSONB column to store user reactions (like, love, fight)
    - Add `comment_count` integer column to cache the number of child comments
  
  2. Details
    - reactions: Stores a mapping of userId -> reactionType (e.g., {"user-123": "like", "user-456": "love"})
    - comment_count: Denormalized counter for performance, updated via triggers or application logic
  
  3. Security
    - No RLS changes needed - inherits existing activities table policies
*/

-- Add reactions column (JSONB to store userId -> reactionType mapping)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'reactions'
  ) THEN
    ALTER TABLE activities ADD COLUMN reactions JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add comment_count column (denormalized counter for child notes/comments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'comment_count'
  ) THEN
    ALTER TABLE activities ADD COLUMN comment_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index on reactions for efficient querying
CREATE INDEX IF NOT EXISTS idx_activities_reactions ON activities USING GIN (reactions);

-- Create index on comment_count for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_activities_comment_count ON activities (comment_count) WHERE comment_count > 0;

-- Update comment_count for existing tasks that have child comments
UPDATE activities
SET comment_count = (
  SELECT COUNT(*)
  FROM activities child
  WHERE child.parent_task_id = activities.id
  AND child.type = 'Note'
)
WHERE is_task = true
AND comment_count = 0;