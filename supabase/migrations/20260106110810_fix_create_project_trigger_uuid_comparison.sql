/*
  # Fix Create Project Trigger - UUID Comparison Error
  
  ## Problem
  The `create_project_on_win()` trigger fails when advancing opportunities to "Won" stage.
  Error: "invalid input syntax for type uuid: ''"
  
  ## Root Cause
  Line 9 of the function attempts to compare a UUID column to an empty string:
  ```sql
  IF NEW.account_id IS NULL OR NEW.account_id = '' THEN
  ```
  
  PostgreSQL UUIDs are strongly typed and cannot be compared to empty strings.
  
  ## Solution
  Remove the empty string comparison and only check for NULL.
  
  ## Impact
  - Fixes the "Advance to Won Stage" button
  - Allows automatic project creation when opportunities are won
  - Managers can now advance their subordinates' opportunities to Won
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS create_project_on_win() CASCADE;

-- Recreate with the UUID comparison fix
CREATE OR REPLACE FUNCTION create_project_on_win()
RETURNS TRIGGER AS $$
DECLARE
  account_country text;
BEGIN
  -- Only create if stage changed TO 'Won'
  IF NEW.stage = 'Won' AND (OLD.stage IS NULL OR OLD.stage != 'Won') THEN

    -- Skip if account_id is NULL (removed empty string check)
    IF NEW.account_id IS NULL THEN
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_project_handover ON opportunities;
CREATE TRIGGER trigger_project_handover
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION create_project_on_win();
