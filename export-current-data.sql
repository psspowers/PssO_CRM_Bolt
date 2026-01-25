-- =====================================================
-- DATA EXPORT SCRIPT
-- =====================================================
-- Run these queries in your CURRENT Supabase SQL Editor
-- to export data before migrating to your own account
-- =====================================================

-- STEP 1: Export Core CRM Data
-- Copy results and save as CSV files

-- Export CRM Users (excluding sensitive 2FA data)
SELECT
  id, email, name, role, avatar, badges, reports_to,
  is_active, commission_rate_thb_mw, annual_quota_mw,
  created_at, updated_at
FROM crm_users
ORDER BY created_at;

-- Export Accounts
SELECT * FROM accounts ORDER BY created_at;

-- Export Opportunities
SELECT * FROM opportunities ORDER BY created_at;

-- Export Partners
SELECT * FROM partners ORDER BY created_at;

-- Export Contacts
SELECT * FROM contacts ORDER BY created_at;

-- Export Projects
SELECT * FROM projects ORDER BY created_at;

-- Export Activities
SELECT * FROM activities ORDER BY created_at;

-- Export Relationships
SELECT * FROM relationships ORDER BY created_at;

-- STEP 2: Export Junction Tables

-- Export Account-Partner Links
SELECT * FROM account_partners ORDER BY created_at;

-- Export Opportunity-Partner Links
SELECT * FROM opportunity_partners ORDER BY created_at;

-- Export Project-Partner Links
SELECT * FROM project_partners ORDER BY created_at;

-- STEP 3: Export History & Tracking

-- Export Opportunity Stage History
SELECT * FROM opportunity_stage_history ORDER BY changed_at;

-- Export Market News
SELECT * FROM market_news ORDER BY created_at;

-- Export Notifications (optional - can regenerate)
-- SELECT * FROM notifications ORDER BY created_at;

-- Export User Hierarchy (will be regenerated automatically)
-- SELECT * FROM user_hierarchy;

-- STEP 4: Export Media File Metadata
SELECT * FROM media_files ORDER BY created_at;

-- STEP 5: Export System Settings
SELECT * FROM system_settings;

-- =====================================================
-- IMPORT SCRIPT TEMPLATE (for your NEW Supabase)
-- =====================================================
-- After running migrations in your new Supabase,
-- use these templates to import your data:

/*
-- Example: Import Accounts
INSERT INTO accounts (id, name, type, industry, website, phone, email, address, city, state, country, postal_code, description, owner_id, sector, sub_industry, clickup_link, notes, strategic_importance, created_at, updated_at)
VALUES
  -- Paste your exported data here
  ('uuid-here', 'Account Name', 'Customer', 'Solar', 'https://example.com', '+1234567890', 'contact@example.com', '123 Street', 'City', 'State', 'Country', '12345', 'Description', 'owner-uuid', 'Sector', 'Sub-Industry', 'https://clickup.com', 'Notes', 'High', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Repeat for other tables
*/

-- =====================================================
-- STORAGE MIGRATION (Manual Process)
-- =====================================================
-- Files in storage buckets must be downloaded and re-uploaded manually:

-- 1. Download all files from 'vault' bucket
-- 2. Download all files from 'avatars' bucket
-- 3. After setting up new Supabase, re-upload files
-- 4. Update media_files table with new storage paths if needed

-- Query to get all vault files:
SELECT
  id,
  file_name,
  storage_path,
  category,
  related_to_id,
  related_to_type
FROM media_files
ORDER BY created_at;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================
-- Run these queries in your NEW Supabase to verify:

-- Check row counts match
SELECT 'accounts' as table_name, COUNT(*) as count FROM accounts
UNION ALL SELECT 'opportunities', COUNT(*) FROM opportunities
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'partners', COUNT(*) FROM partners
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'activities', COUNT(*) FROM activities
UNION ALL SELECT 'relationships', COUNT(*) FROM relationships
UNION ALL SELECT 'crm_users', COUNT(*) FROM crm_users;

-- Verify RLS policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Verify functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Auth users (auth.users table) must be recreated manually
--    or users can sign up fresh in new system
-- 2. Passwords cannot be exported (hashed in auth.users)
-- 3. 2FA secrets are encrypted and should not be migrated
-- 4. User hierarchy will be auto-regenerated after importing crm_users
-- 5. Stage history is optional - can start fresh for analytics
-- =====================================================
