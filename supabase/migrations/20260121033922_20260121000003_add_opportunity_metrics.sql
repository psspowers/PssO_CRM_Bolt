/*
  # Add Opportunity Metrics - IRR and Primary Partner

  1. New Columns
    - `project_irr` (numeric) - Project Internal Rate of Return percentage
    - `primary_partner_id` (uuid) - Reference to the primary partner for this opportunity
  
  2. Changes
    - Add `project_irr` column to opportunities table
    - Add `primary_partner_id` column with foreign key to partners table
  
  3. Performance
    - Create index on `primary_partner_id` for faster joins
  
  4. Security
    - Columns are nullable by default
    - RLS policies inherit from existing opportunities table policies
*/

-- Add new columns to opportunities table
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS project_irr numeric,
ADD COLUMN IF NOT EXISTS primary_partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;

-- Create index for faster partner lookups
CREATE INDEX IF NOT EXISTS idx_opportunities_partner ON opportunities(primary_partner_id);

-- Add comment for documentation
COMMENT ON COLUMN opportunities.project_irr IS 'Project Internal Rate of Return as a percentage (e.g., 12.5 for 12.5%)';
COMMENT ON COLUMN opportunities.primary_partner_id IS 'Reference to the primary partner (EPC, developer, etc.) for this opportunity';
