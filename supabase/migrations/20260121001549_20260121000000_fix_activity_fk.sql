/*
  # Fix Task Assignment Foreign Key

  1. Changes
    - Standardizes column naming (assigned_to → assigned_to_id if needed)
    - Adds foreign key constraint from activities.assigned_to_id to crm_users.id
    
  2. Security
    - Ensures referential integrity for task assignments
    - Prevents orphaned task assignments when users are deleted
*/

DO $$ 
BEGIN 
  -- 1. Standardize Column Name (if old 'assigned_to' exists, rename it)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'activities' 
    AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE activities RENAME COLUMN assigned_to TO assigned_to_id;
  END IF;

  -- 2. Add Foreign Key Constraint
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'activities_assigned_to_fkey'
  ) THEN
    ALTER TABLE activities 
    ADD CONSTRAINT activities_assigned_to_fkey 
    FOREIGN KEY (assigned_to_id) 
    REFERENCES crm_users(id);
  END IF;
END $$;
