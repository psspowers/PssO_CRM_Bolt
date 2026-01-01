-- ============================================================================
-- PART 2: CREATE JOIN TABLES
-- ============================================================================
-- Run this SECOND in DatabasePad SQL Editor
-- ============================================================================

-- Account ↔ Partner relationship
CREATE TABLE IF NOT EXISTS account_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, partner_id)
);

-- Opportunity ↔ Partner relationship
CREATE TABLE IF NOT EXISTS opportunity_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(opportunity_id, partner_id)
);

-- Project ↔ Partner relationship
CREATE TABLE IF NOT EXISTS project_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, partner_id)
);
