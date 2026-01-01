-- ============================================================
-- SCHEMA DIAGNOSTIC QUERY
-- Purpose: Verify ACTUAL database state before any modifications
-- Run this in DatabasePad SQL Editor and paste results back
-- ============================================================

-- Query 1: Get ALL columns for core CRM tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts',
    'opportunities', 
    'contacts',
    'activities',
    'partners',
    'projects',
    'relationships',
    'crm_users'
  )
ORDER BY 
    table_name,
    ordinal_position;
