-- ==========================================
-- PHASE 1: CORRECTED & COMPLETE
-- Audit Triggers, Dashboard Stats, Performance Indexes
-- Run this in Supabase SQL Editor
-- ==========================================

-- ==========================================
-- 1. AUDIT LOG TRIGGERS (Item 6) - CORRECTED
-- Now includes ALL CRM tables: partners, accounts, 
-- contacts, opportunities, projects, activities
-- ==========================================

-- Create the generic trigger function
CREATE OR REPLACE FUNCTION public.log_crm_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
  user_email text;
  old_val jsonb;
  new_val jsonb;
BEGIN
  -- Get current user ID (if logged in)
  current_user_id := auth.uid();
  
  -- If system/service role, skip logging to avoid infinite loops
  IF current_user_id IS NULL THEN 
    RETURN COALESCE(NEW, OLD); 
  END IF;

  -- Get user email for readability
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;

  IF (TG_OP = 'DELETE') THEN
    old_val := to_jsonb(OLD);
    INSERT INTO public.admin_activity_logs (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (current_user_id, user_email, 'DELETE', TG_TABLE_NAME, OLD.id, old_val);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_val := to_jsonb(OLD);
    new_val := to_jsonb(NEW);
    -- Only log if data actually changed
    IF old_val != new_val THEN
      INSERT INTO public.admin_activity_logs (user_id, user_email, action, entity_type, entity_id, details)
      VALUES (current_user_id, user_email, 'UPDATE', TG_TABLE_NAME, NEW.id, 
              jsonb_build_object('old', old_val, 'new', new_val));
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    new_val := to_jsonb(NEW);
    INSERT INTO public.admin_activity_logs (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (current_user_id, user_email, 'CREATE', TG_TABLE_NAME, NEW.id, new_val);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to ALL key CRM tables (not just 3)
DROP TRIGGER IF EXISTS audit_partners ON public.partners;
CREATE TRIGGER audit_partners 
  AFTER INSERT OR UPDATE OR DELETE ON public.partners 
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_changes();

DROP TRIGGER IF EXISTS audit_accounts ON public.accounts;
CREATE TRIGGER audit_accounts 
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts 
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_changes();

DROP TRIGGER IF EXISTS audit_opportunities ON public.opportunities;
CREATE TRIGGER audit_opportunities 
  AFTER INSERT OR UPDATE OR DELETE ON public.opportunities 
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_changes();

-- *** MISSING FROM ORIGINAL: contacts trigger ***
DROP TRIGGER IF EXISTS audit_contacts ON public.contacts;
CREATE TRIGGER audit_contacts 
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts 
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_changes();

-- *** MISSING FROM ORIGINAL: projects trigger ***
DROP TRIGGER IF EXISTS audit_projects ON public.projects;
CREATE TRIGGER audit_projects 
  AFTER INSERT OR UPDATE OR DELETE ON public.projects 
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_changes();

-- *** MISSING FROM ORIGINAL: activities trigger ***
DROP TRIGGER IF EXISTS audit_activities ON public.activities;
CREATE TRIGGER audit_activities 
  AFTER INSERT OR UPDATE OR DELETE ON public.activities 
  FOR EACH ROW EXECUTE FUNCTION public.log_crm_changes();


-- ==========================================
-- 2. DASHBOARD STATS RPC (Item 7) - ENHANCED
-- Added more useful metrics for the dashboard
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  total_pipeline numeric;
  active_deals int;
  won_deals int;
  lost_deals int;
  total_capacity numeric;
  partners_count int;
  accounts_count int;
  contacts_count int;
  activities_this_week int;
  result json;
BEGIN
  -- Pipeline value (excluding Lost deals)
  SELECT COALESCE(SUM(value), 0) INTO total_pipeline 
  FROM public.opportunities 
  WHERE stage != 'Lost';

  -- Active deals (not Won or Lost)
  SELECT COUNT(*) INTO active_deals 
  FROM public.opportunities 
  WHERE stage NOT IN ('Won', 'Lost');

  -- Won deals this month
  SELECT COUNT(*) INTO won_deals 
  FROM public.opportunities 
  WHERE stage = 'Won' 
  AND created_at > (now() - interval '30 days');

  -- Lost deals this month
  SELECT COUNT(*) INTO lost_deals 
  FROM public.opportunities 
  WHERE stage = 'Lost' 
  AND updated_at > (now() - interval '30 days');

  -- Total project capacity (MW)
  SELECT COALESCE(SUM(capacity), 0) INTO total_capacity 
  FROM public.projects;

  -- Entity counts
  SELECT COUNT(*) INTO partners_count FROM public.partners;
  SELECT COUNT(*) INTO accounts_count FROM public.accounts;
  SELECT COUNT(*) INTO contacts_count FROM public.contacts;

  -- Activities this week
  SELECT COUNT(*) INTO activities_this_week 
  FROM public.activities 
  WHERE created_at > (now() - interval '7 days');

  result := json_build_object(
    'total_pipeline', total_pipeline,
    'active_deals', active_deals,
    'won_deals_month', won_deals,
    'lost_deals_month', lost_deals,
    'win_rate', CASE WHEN (won_deals + lost_deals) > 0 
                     THEN ROUND((won_deals::numeric / (won_deals + lost_deals)) * 100) 
                     ELSE 0 END,
    'total_capacity', total_capacity,
    'partners_count', partners_count,
    'accounts_count', accounts_count,
    'contacts_count', contacts_count,
    'activities_this_week', activities_this_week
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;


-- ==========================================
-- 3. PIPELINE BY STAGE RPC (Bonus)
-- Returns pipeline breakdown by stage
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_pipeline_by_stage()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT 
        stage,
        COUNT(*) as count,
        COALESCE(SUM(value), 0) as total_value
      FROM public.opportunities
      WHERE stage NOT IN ('Won', 'Lost')
      GROUP BY stage
      ORDER BY 
        CASE stage 
          WHEN 'Prospect' THEN 1
          WHEN 'Qualification' THEN 2
          WHEN 'Proposal' THEN 3
          WHEN 'Negotiation' THEN 4
          WHEN 'Due Diligence' THEN 5
          ELSE 6
        END
    ) t
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_pipeline_by_stage() TO authenticated;


-- ==========================================
-- 4. OPPORTUNITIES BY SECTOR RPC (Bonus)
-- Returns sector breakdown for charts
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_opportunities_by_sector()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT 
        COALESCE(sector, 'Unknown') as sector,
        COUNT(*) as count,
        COALESCE(SUM(value), 0) as total_value
      FROM public.opportunities
      WHERE stage NOT IN ('Lost')
      GROUP BY sector
      ORDER BY total_value DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_opportunities_by_sector() TO authenticated;


-- ==========================================
-- 5. PERFORMANCE INDEXES (Item 8) - COMPLETE
-- Added missing indexes for projects & activities
-- ==========================================

-- Partners
CREATE INDEX IF NOT EXISTS idx_partners_owner ON public.partners(owner_id);

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts(owner_id);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);

-- Opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON public.opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_account ON public.opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_sector ON public.opportunities(sector);

-- *** MISSING FROM ORIGINAL: Projects indexes ***
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- *** MISSING FROM ORIGINAL: Activities indexes ***
CREATE INDEX IF NOT EXISTS idx_activities_owner ON public.activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_related ON public.activities(related_to_id, related_to_type);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(created_at DESC);

-- Media files
CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by ON public.media_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_files_related ON public.media_files(related_to_id, related_to_type);


-- ==========================================
-- VERIFICATION QUERIES
-- Run these to confirm everything worked
-- ==========================================

-- Check triggers exist
-- SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'audit_%';

-- Check functions exist
-- SELECT proname FROM pg_proc WHERE proname IN ('log_crm_changes', 'get_dashboard_stats', 'get_pipeline_by_stage', 'get_opportunities_by_sector');

-- Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- Test dashboard stats
-- SELECT get_dashboard_stats();
