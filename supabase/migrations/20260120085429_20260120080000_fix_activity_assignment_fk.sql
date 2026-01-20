/*
  # Fix Activity Assignment Foreign Key

  1. Changes
    - Add foreign key constraint from activities.assigned_to_id to crm_users.id
    - Ensures referential integrity for task assignments
  
  2. Security
    - No RLS changes needed (existing policies remain in effect)
*/

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'activities_assigned_to_fkey'
    AND table_name = 'activities'
  ) THEN
    ALTER TABLE activities 
    ADD CONSTRAINT activities_assigned_to_fkey 
    FOREIGN KEY (assigned_to_id) 
    REFERENCES crm_users(id)
    ON DELETE SET NULL;
  END IF;
END $$;
