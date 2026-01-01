/*
  # Update Project Status Stages

  1. Changes
    - Updates project status values to match real project lifecycle
    - Maps old values to new correct values:
      * Discovery → Won
      * Pre-Dev → Engineering
      * Dev → Engineering
      * Contract → Permit/EPC
      * Construction → Construction (unchanged)
      * Operational → Operational (unchanged)
    - Updates check constraint to enforce new values
  
  2. New Status Values
    - Won: Projects won from opportunities
    - Engineering: Technical design and engineering phase
    - Permit/EPC: Permitting and EPC contractor phase
    - Construction: Active construction phase
    - Commissioning: Testing and commissioning before operation
    - Operational: Live and generating power
*/

-- Update existing project records to new status values
UPDATE projects SET status = 'Won' WHERE status = 'Discovery';
UPDATE projects SET status = 'Engineering' WHERE status IN ('Pre-Dev', 'Dev');
UPDATE projects SET status = 'Permit/EPC' WHERE status = 'Contract';
-- Construction and Operational stay the same

-- Drop old check constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'projects' AND constraint_name LIKE '%status_check%'
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
  END IF;
END $$;

-- Add new check constraint with updated status values
ALTER TABLE projects 
  ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('Won', 'Engineering', 'Permit/EPC', 'Construction', 'Commissioning', 'Operational'));