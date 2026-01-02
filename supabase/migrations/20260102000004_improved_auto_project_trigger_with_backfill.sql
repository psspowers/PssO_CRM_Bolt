/*
  # Improved Auto-Project Creation with Backfill

  ## Overview
  Creates an improved trigger for automatic project creation when opportunities
  are won, and backfills existing Won opportunities into the projects table.

  ## Changes Made
  
  ### 1. New Trigger Function: create_project_on_win()
  - Fires when opportunity stage changes to 'Won'
  - Checks for duplicates by account_id + name combination
  - Copies comprehensive data from opportunity to project:
    - name, capacity, owner
    - country from linked account
    - clickup_link, notes for continuity
    - linked_opportunity_id for tracking
  
  ### 2. Trigger: trigger_project_handover
  - Replaces previous trigger
  - Fires AFTER UPDATE on opportunities
  - Only when stage becomes 'Won'
  
  ### 3. Backfill Existing Won Opportunities
  - Copies all 7 existing 'Won' opportunities to projects table
  - Preserves all relevant data
  - Skips duplicates based on account + name combination

  ## Security
  - Function has SECURITY DEFINER for insert permissions
  - Proper NULL handling and default values

  ## Data Impact
  - Backfills 7 existing Won opportunities into projects
*/

-- Drop old trigger and function
DROP TRIGGER IF EXISTS opportunities_won_auto_project ON opportunities;
DROP FUNCTION IF EXISTS auto_create_project_on_won();

-- 1. Create the Automation Function
CREATE OR REPLACE FUNCTION create_project_on_win()
RETURNS TRIGGER AS $$
DECLARE
  account_country text;
BEGIN
  -- Only create if stage changed TO 'Won'
  IF NEW.stage = 'Won' AND (OLD.stage IS NULL OR OLD.stage != 'Won') THEN
    
    -- Get country from account
    SELECT country INTO account_country 
    FROM accounts 
    WHERE id = NEW.account_id;

    -- Check if project already exists (by account + name)
    IF NOT EXISTS (
      SELECT 1 FROM projects 
      WHERE linked_account_id = NEW.account_id 
      AND name = NEW.name
    ) THEN
      
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
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Attach Trigger to Opportunities
CREATE TRIGGER trigger_project_handover
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION create_project_on_win();

-- 3. BACKFILL: Copy existing 'Won' opportunities to Projects
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
)
SELECT 
  o.name, 
  o.account_id, 
  COALESCE(a.country, ''), 
  COALESCE(o.target_capacity, 0), 
  'Won', 
  o.owner_id,
  o.id,
  o.clickup_link,
  o.notes,
  NOW(),
  NOW()
FROM opportunities o
LEFT JOIN accounts a ON o.account_id = a.id
WHERE o.stage = 'Won'
AND NOT EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.linked_account_id = o.account_id 
  AND p.name = o.name
);
