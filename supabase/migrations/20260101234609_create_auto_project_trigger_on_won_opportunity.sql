/*
  # Auto-Create Project When Opportunity is Won

  ## Overview
  This migration creates a PostgreSQL trigger that automatically creates a project
  when an opportunity's stage is updated to 'Won'. This ensures seamless handover
  from sales pipeline to project execution.

  ## Changes Made
  
  ### Trigger Function: auto_create_project_on_won()
  - Fires when an opportunity stage changes to 'Won'
  - Checks if a project already exists for this opportunity
  - If not, creates a new project with:
    - name: copied from opportunity
    - linked_account_id: opportunity's account_id
    - country: retrieved from linked account
    - capacity: opportunity's target_capacity
    - status: 'Won' (first stage of project execution)
    - owner_id: opportunity's owner_id
    - linked_opportunity_id: opportunity's id (for tracking)
    - clickup_link: copied from opportunity
    - notes: copied from opportunity

  ### Trigger: opportunities_won_auto_project
  - Fires AFTER UPDATE on opportunities table
  - Only when stage changes from non-'Won' to 'Won'
  - Calls auto_create_project_on_won() function

  ## Security
  - Function has SECURITY DEFINER to ensure it can insert into projects
  - Uses proper NULL checks and default values
  - Prevents duplicate project creation

  ## Notes
  - Country is fetched from the linked account
  - If no country found, defaults to empty string
  - Existing projects for the same opportunity are not duplicated
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_create_project_on_won()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  account_country text;
BEGIN
  -- Only proceed if the stage changed TO 'Won' (wasn't 'Won' before)
  IF NEW.stage = 'Won' AND (OLD.stage IS NULL OR OLD.stage != 'Won') THEN
    
    -- Check if a project already exists for this opportunity
    IF NOT EXISTS (
      SELECT 1 FROM projects 
      WHERE linked_opportunity_id = NEW.id
    ) THEN
      
      -- Get the country from the linked account
      SELECT country INTO account_country
      FROM accounts
      WHERE id = NEW.account_id;
      
      -- Create the project
      INSERT INTO projects (
        id,
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
        gen_random_uuid(),
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
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS opportunities_won_auto_project ON opportunities;

CREATE TRIGGER opportunities_won_auto_project
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  WHEN (NEW.stage = 'Won' AND (OLD.stage IS NULL OR OLD.stage != 'Won'))
  EXECUTE FUNCTION auto_create_project_on_won();
