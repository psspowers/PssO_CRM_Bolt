-- ============================================================================
-- PART 1: ADD MISSING COLUMNS
-- ============================================================================
-- Run this FIRST in DatabasePad SQL Editor
-- ============================================================================

-- OPPORTUNITIES TABLE - 11 new columns
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS target_capacity NUMERIC;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS re_type TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS sub_industry TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS target_decision_date TIMESTAMPTZ;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS completed_milestones TEXT[];
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS operating_days TEXT[];
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS risk_profile JSONB;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS bankability_score NUMERIC;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- CONTACTS TABLE - 2 new columns
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
