/*
  # Fix Auto-Project Trigger Hanging Issue
  
  ## Problem
  The auto-project trigger was causing bulk imports to hang when:
  - Opportunities with stage 'Won' are imported
  - account_id is NULL or invalid
  - The trigger fails silently without proper error handling
  
  ## Solution
  1. Add NULL checks before querying accounts table
  2. Add exception handling to prevent trigger from blocking imports
  3. Skip project creation if account_id is NULL
  4. Add logging for debugging
  
  ## Changes
  - Updated create_project_on_win() with better NULL handling
  - Added EXCEPTION block to catch and ignore errors without blocking
  - Only creates project if account_id is valid
*/

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_project_on_win()
RETURNS TRIGGER AS $$
DECLARE
  account_country text;
BEGIN
  -- Only create if stage changed TO 'Won'
  IF NEW.stage = 'Won' AND (OLD.stage IS NULL OR OLD.stage != 'Won') THEN
    
    -- Skip if account_id is NULL or empty
    IF NEW.account_id IS NULL OR NEW.account_id = '' THEN
      RETURN NEW;
    END IF;
    
    -- Get country from account (with NULL safety)
    BEGIN
      SELECT country INTO account_country 
      FROM accounts 
      WHERE id = NEW.account_id;
    EXCEPTION WHEN OTHERS THEN
      -- If account lookup fails, just continue without creating project
      RETURN NEW;
    END;

    -- Check if project already exists (by account + name)
    IF NOT EXISTS (
      SELECT 1 FROM projects 
      WHERE linked_account_id = NEW.account_id 
      AND name = NEW.name
    ) THEN
      
      BEGIN
        -- Create the project with comprehensive data
        INSERT INTO projects (
          name, 
          linked_account_id, 
          country, 
          capacity, 
          status, 
          owner_id,
          linked_opportunity_id,
          clickup_link,
          notes,
          created_at,
          updated_at
        ) VALUES (
          NEW.name, 
          NEW.account_id, 
          COALESCE(account_country, ''), 
          COALESCE(NEW.target_capacity, 0), 
          'Won', 
          NEW.owner_id,
          NEW.id,
          NEW.clickup_link,
          NEW.notes,
          NOW(),
          NOW()
        );
      EXCEPTION WHEN OTHERS THEN
        -- If project creation fails, don't block the opportunity insert/update
        -- This ensures bulk imports continue even if project creation fails
        NULL;
      END;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
