/*
  # Migrate Opportunity Stages to Sales Pipeline

  ## Overview
  This migration updates all opportunities to use the correct sales pipeline stages,
  separating sales opportunities from project execution stages.

  ## Changes Made
  
  ### Stage Mapping
  Maps old project-based stages to proper sales stages:
  
  - **Discovery, Pre-Dev** → **Prospect** (Early stage lead identification)
  - **Development** → **Proposal** (Active development of proposal/solution)
  - **Contract** → **Term Sheet** (Contract negotiation and term sheet stage)
  - **Engineering, Permit - EPC, Construction, Commissioning, Operational** → **Won** 
    (These are project execution stages - if we're building, the deal is won)
  - **Won** → **Won** (No change - deal closed successfully)
  - **Lost** → **Lost** (No change - deal not pursued)

  ## Data Impact
  Updates all opportunity records to align with the new OpportunityStage type definition:
  'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Term Sheet' | 'Won' | 'Lost'

  ## Notes
  - After this migration, only sales stages will be valid for opportunities
  - Project execution stages (Engineering, Construction, etc.) should only exist in the projects table
  - This creates a clear separation: Opportunities track sales, Projects track execution
*/

-- Step 1: Drop the existing check constraint
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_stage_check;

-- Step 2: Update opportunities with old project-based stages to proper sales stages
UPDATE opportunities
SET stage = CASE
  -- Early stage leads become Prospect
  WHEN stage IN ('Discovery', 'Pre-Dev') THEN 'Prospect'
  
  -- Development becomes Proposal stage
  WHEN stage = 'Development' THEN 'Proposal'
  
  -- Contract negotiations become Term Sheet
  WHEN stage = 'Contract' THEN 'Term Sheet'
  
  -- All execution stages mean the deal is already Won
  WHEN stage IN ('Engineering', 'Permit - EPC', 'Construction', 'Commissioning', 'Operational') THEN 'Won'
  
  -- Keep Won and Lost as-is
  WHEN stage = 'Won' THEN 'Won'
  WHEN stage = 'Lost' THEN 'Lost'
  
  -- Default fallback to Prospect for any other values
  ELSE 'Prospect'
END
WHERE stage NOT IN ('Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Won', 'Lost');

-- Step 3: Add the new check constraint with correct sales stages
ALTER TABLE opportunities 
ADD CONSTRAINT opportunities_stage_check 
CHECK (stage IN ('Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Won', 'Lost'));
