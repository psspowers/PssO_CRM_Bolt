-- ============================================================================
-- PART 3: ENABLE RLS AND CREATE POLICIES
-- ============================================================================
-- Run this THIRD in DatabasePad SQL Editor
-- ============================================================================

-- Enable RLS on join tables
ALTER TABLE account_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_partners ENABLE ROW LEVEL SECURITY;

-- account_partners policies
CREATE POLICY IF NOT EXISTS account_partners_select ON account_partners FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS account_partners_insert ON account_partners FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS account_partners_update ON account_partners FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS account_partners_delete ON account_partners FOR DELETE USING (true);

-- opportunity_partners policies
CREATE POLICY IF NOT EXISTS opportunity_partners_select ON opportunity_partners FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS opportunity_partners_insert ON opportunity_partners FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS opportunity_partners_update ON opportunity_partners FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS opportunity_partners_delete ON opportunity_partners FOR DELETE USING (true);

-- project_partners policies
CREATE POLICY IF NOT EXISTS project_partners_select ON project_partners FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS project_partners_insert ON project_partners FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS project_partners_update ON project_partners FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS project_partners_delete ON project_partners FOR DELETE USING (true);
