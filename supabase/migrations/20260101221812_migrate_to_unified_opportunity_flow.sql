/*
  # Migrate to Unified Opportunity-to-Project Flow

  1. Overview
    - Consolidates opportunities and projects into a single opportunities table
    - Establishes a unified lifecycle from Discovery through Operational
    - Migrates existing project records into opportunities with project-stage statuses
    
  2. Changes
    - Update existing opportunity stages to new naming convention
    - Migrate all projects into opportunities table with appropriate project stages
    - Add check constraint for valid stage values
    - Projects become filtered views of opportunities based on stage
    
  3. Stage Flow
    - Pre-Win: Discovery, Pre-Dev, Development, Contract
    - Transition: Won
    - Post-Win (Projects): Engineering, Permit - EPC, Construction, Commissioning, Operational
    - Terminal: Lost
    
  4. Security
    - Maintains existing RLS policies
    - No changes to data access patterns
*/

-- Step 1: Update existing opportunity stages to new convention
UPDATE opportunities SET stage = 'Discovery' WHERE stage = 'Prospect';
UPDATE opportunities SET stage = 'Development' WHERE stage = 'Qualified';
UPDATE opportunities SET stage = 'Contract' WHERE stage IN ('Negotiation', 'Proposal');
-- Won stays as Won

-- Step 2: Migrate projects to opportunities with project stages
INSERT INTO opportunities (
  id,
  name,
  stage,
  notes,
  owner_id,
  created_at,
  updated_at,
  target_capacity,
  clickup_link,
  linked_account_id
)
SELECT 
  p.id,
  p.name,
  CASE 
    WHEN p.status = 'Construction' THEN 'Construction'
    WHEN p.status = 'Operational' THEN 'Operational'
    WHEN p.status = 'Dev' THEN 'Engineering'
    WHEN p.status = 'Pre-Dev' THEN 'Permit - EPC'
    WHEN p.status = 'Contract' THEN 'Commissioning'
    ELSE 'Construction'
  END as stage,
  p.notes,
  p.owner_id,
  p.created_at,
  p.updated_at,
  p.capacity,
  p.clickup_link,
  p.linked_account_id
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities o WHERE o.id = p.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add check constraint with all valid stages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opportunities_stage_check'
  ) THEN
    ALTER TABLE opportunities DROP CONSTRAINT opportunities_stage_check;
  END IF;
END $$;

ALTER TABLE opportunities 
ADD CONSTRAINT opportunities_stage_check 
CHECK (stage IN (
  'Discovery',
  'Pre-Dev', 
  'Development',
  'Contract',
  'Won',
  'Engineering',
  'Permit - EPC',
  'Construction',
  'Commissioning',
  'Operational',
  'Lost'
));

-- Step 4: Set default stage for new opportunities
ALTER TABLE opportunities 
ALTER COLUMN stage SET DEFAULT 'Discovery';