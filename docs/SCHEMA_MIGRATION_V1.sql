-- ============================================================================
-- SCHEMA MIGRATION V1 - Sync Database with TypeScript Interfaces
-- ============================================================================
-- Generated: 2024-12-30
-- Protocol: Zero Assumption - Based on verified schema mismatches
-- Safety: All statements are IDEMPOTENT (safe to run multiple times)
-- ============================================================================

-- ============================================================================
-- SECTION 1: OPPORTUNITIES TABLE - Add Missing Columns
-- ============================================================================
-- These columns support the Investment Modeler and Risk Assessment features
-- Reference: src/types/crm.ts → Opportunity interface (lines 84-114)

-- Target capacity in MW/kW for solar installations
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS target_capacity NUMERIC;

-- Renewable Energy Type (Solar - Rooftop, Solar - Ground, Solar - Floating)
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS re_type TEXT;

-- Thai Sector Taxonomy Classification (3-tier hierarchy)
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS sector TEXT;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS industry TEXT;

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS sub_industry TEXT;

-- Target decision date for the opportunity
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS target_decision_date TIMESTAMPTZ;

-- Array of completed milestone identifiers
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS completed_milestones TEXT[];

-- Array of operating days (e.g., ['Monday', 'Tuesday', ...])
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS operating_days TEXT[];

-- Counterparty Risk Profile - Full Credit Committee assessment
-- Stores the complete CounterpartyRisk object as JSONB
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS risk_profile JSONB;

-- Bankability score (0-100) calculated from risk assessment
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS bankability_score NUMERIC;

-- Reason for lost opportunities (required when stage = 'Lost')
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS lost_reason TEXT;


-- ============================================================================
-- SECTION 2: CONTACTS TABLE - Add Missing Foreign Key Columns
-- ============================================================================
-- These columns link contacts to their parent Account or Partner
-- Reference: src/types/crm.ts → Contact interface (lines 78-81)

-- Link contact to an Account (optional - contact may belong to Partner instead)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Link contact to a Partner (optional - contact may belong to Account instead)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;


-- ============================================================================
-- SECTION 3: JOIN TABLES - Many-to-Many Relationships
-- ============================================================================
-- These tables support the linkedPartnerIds arrays in Account, Opportunity, Project
-- Reference: src/types/crm.ts → Account.linkedPartnerIds, Opportunity.linkedPartnerIds, etc.

-- Account ↔ Partner relationship (Account.linkedPartnerIds)
CREATE TABLE IF NOT EXISTS account_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, partner_id)
);

-- Opportunity ↔ Partner relationship (Opportunity.linkedPartnerIds)
CREATE TABLE IF NOT EXISTS opportunity_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(opportunity_id, partner_id)
);

-- Project ↔ Partner relationship (Project.linkedPartnerIds)
CREATE TABLE IF NOT EXISTS project_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, partner_id)
);


-- ============================================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- ============================================================================
-- Ensures new join tables follow the same security model as parent tables

ALTER TABLE account_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_partners ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (adjust based on your RLS strategy)
DO $$
BEGIN
    -- account_partners policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_partners' AND policyname = 'account_partners_select') THEN
        CREATE POLICY account_partners_select ON account_partners FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_partners' AND policyname = 'account_partners_insert') THEN
        CREATE POLICY account_partners_insert ON account_partners FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_partners' AND policyname = 'account_partners_update') THEN
        CREATE POLICY account_partners_update ON account_partners FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_partners' AND policyname = 'account_partners_delete') THEN
        CREATE POLICY account_partners_delete ON account_partners FOR DELETE USING (true);
    END IF;

    -- opportunity_partners policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunity_partners' AND policyname = 'opportunity_partners_select') THEN
        CREATE POLICY opportunity_partners_select ON opportunity_partners FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunity_partners' AND policyname = 'opportunity_partners_insert') THEN
        CREATE POLICY opportunity_partners_insert ON opportunity_partners FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunity_partners' AND policyname = 'opportunity_partners_update') THEN
        CREATE POLICY opportunity_partners_update ON opportunity_partners FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunity_partners' AND policyname = 'opportunity_partners_delete') THEN
        CREATE POLICY opportunity_partners_delete ON opportunity_partners FOR DELETE USING (true);
    END IF;

    -- project_partners policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_partners' AND policyname = 'project_partners_select') THEN
        CREATE POLICY project_partners_select ON project_partners FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_partners' AND policyname = 'project_partners_insert') THEN
        CREATE POLICY project_partners_insert ON project_partners FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_partners' AND policyname = 'project_partners_update') THEN
        CREATE POLICY project_partners_update ON project_partners FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_partners' AND policyname = 'project_partners_delete') THEN
        CREATE POLICY project_partners_delete ON project_partners FOR DELETE USING (true);
    END IF;
END $$;


-- ============================================================================
-- SECTION 5: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Indexes on foreign keys and commonly queried columns

-- Opportunities indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_sector ON opportunities(sector);
CREATE INDEX IF NOT EXISTS idx_opportunities_industry ON opportunities(industry);
CREATE INDEX IF NOT EXISTS idx_opportunities_re_type ON opportunities(re_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_bankability_score ON opportunities(bankability_score);
CREATE INDEX IF NOT EXISTS idx_opportunities_target_decision_date ON opportunities(target_decision_date);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_partner_id ON contacts(partner_id);

-- Join table indexes (for efficient lookups)
CREATE INDEX IF NOT EXISTS idx_account_partners_account ON account_partners(account_id);
CREATE INDEX IF NOT EXISTS idx_account_partners_partner ON account_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_partners_opportunity ON opportunity_partners(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_partners_partner ON opportunity_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_project ON project_partners(project_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_partner ON project_partners(partner_id);


-- ============================================================================
-- SECTION 6: VERIFICATION QUERY
-- ============================================================================
-- Run this after migration to confirm all columns and tables were created
-- Copy and run separately to verify success

/*
SELECT 
    'VERIFICATION RESULTS' as section,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'opportunities' AND column_name IN (
        'target_capacity', 're_type', 'sector', 'industry', 'sub_industry',
        'target_decision_date', 'completed_milestones', 'operating_days',
        'risk_profile', 'bankability_score', 'lost_reason'
    ))
    OR (table_name = 'contacts' AND column_name IN ('account_id', 'partner_id'))
    OR (table_name IN ('account_partners', 'opportunity_partners', 'project_partners'))
  )
ORDER BY table_name, column_name;
*/


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Expected Results:
-- ✓ 11 new columns added to opportunities table
-- ✓ 2 new columns added to contacts table  
-- ✓ 3 new join tables created (account_partners, opportunity_partners, project_partners)
-- ✓ RLS enabled on all new tables with permissive policies
-- ✓ Performance indexes created
-- ============================================================================
