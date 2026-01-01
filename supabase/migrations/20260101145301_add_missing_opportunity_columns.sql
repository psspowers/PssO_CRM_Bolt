/*
  # Add Missing Columns to Opportunities Table
  
  1. Changes
    - Add `sector` (text) - Thai taxonomy classification
    - Add `sub_industry` (text) - Thai taxonomy classification  
    - Add `completed_milestones` (text[]) - Quality gate tracking
    - Add `lost_reason` (text) - Termination reason tracking
    - Add `operating_days` (text[]) - Load analyzer data
    - Add `daytime_load_kw` (numeric) - Load analyzer data
    - Add `is_24_hours` (boolean) - Load analyzer flag
  
  2. Notes
    - All columns are nullable for backward compatibility
    - Arrays default to empty array
    - Boolean defaults to false
*/

-- Add Thai Taxonomy columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'sector'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN sector text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'sub_industry'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN sub_industry text;
  END IF;
END $$;

-- Add Quality Gate tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'completed_milestones'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN completed_milestones text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN lost_reason text;
  END IF;
END $$;

-- Add Load Analyzer columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'operating_days'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN operating_days text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'daytime_load_kw'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN daytime_load_kw numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'is_24_hours'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN is_24_hours boolean DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN opportunities.sector IS 'Thai taxonomy sector classification';
COMMENT ON COLUMN opportunities.sub_industry IS 'Thai taxonomy sub-industry classification';
COMMENT ON COLUMN opportunities.completed_milestones IS 'Array of completed quality gate milestone IDs';
COMMENT ON COLUMN opportunities.lost_reason IS 'Reason for deal termination if stage = Lost';
COMMENT ON COLUMN opportunities.operating_days IS 'Array of operating days for load analysis';
COMMENT ON COLUMN opportunities.daytime_load_kw IS 'Daytime load in kilowatts for solar sizing';
COMMENT ON COLUMN opportunities.is_24_hours IS 'Whether facility operates 24/7';