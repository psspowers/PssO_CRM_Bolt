-- ============================================================================
-- PART 4: CREATE PERFORMANCE INDEXES
-- ============================================================================
-- Run this FOURTH in DatabasePad SQL Editor
-- ============================================================================

-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_sector ON opportunities(sector);
CREATE INDEX IF NOT EXISTS idx_opportunities_industry ON opportunities(industry);
CREATE INDEX IF NOT EXISTS idx_opportunities_re_type ON opportunities(re_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_bankability_score ON opportunities(bankability_score);
CREATE INDEX IF NOT EXISTS idx_opportunities_target_decision_date ON opportunities(target_decision_date);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_partner_id ON contacts(partner_id);

-- Join table indexes
CREATE INDEX IF NOT EXISTS idx_account_partners_account ON account_partners(account_id);
CREATE INDEX IF NOT EXISTS idx_account_partners_partner ON account_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_partners_opportunity ON opportunity_partners(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_partners_partner ON opportunity_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_project ON project_partners(project_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_partner ON project_partners(partner_id);
