/*
  # Add Project Status Check Constraint

  ## Overview
  Ensures only valid project execution stages can be stored in the projects table.

  ## Changes Made
  
  ### Check Constraint: projects_status_check
  Enforces that project status must be one of:
  - 'Won' - Deal closed, project initiated
  - 'Engineering' - Engineering and design phase
  - 'Permit/EPC' - Permitting and EPC phase
  - 'Construction' - Construction phase
  - 'Commissioning' - Commissioning phase
  - 'Operational' - Project operational

  ## Data Impact
  All existing projects already have valid statuses, so this constraint
  adds protection without requiring data cleanup.

  ## Notes
  - This ensures project execution stages remain separate from sales stages
  - Prevents accidental use of sales stages (Prospect, Proposal, etc.) in projects
*/

-- Drop existing constraint if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add check constraint for valid project statuses
ALTER TABLE projects
ADD CONSTRAINT projects_status_check
CHECK (status IN ('Won', 'Engineering', 'Permit/EPC', 'Construction', 'Commissioning', 'Operational'));
