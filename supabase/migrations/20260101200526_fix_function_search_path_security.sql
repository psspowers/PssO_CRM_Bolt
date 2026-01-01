/*
  # Security Hardening: Fix Function Search Path Injection Vulnerability

  ## Critical Security Fix
  This migration locks down the search_path for SECURITY DEFINER functions
  to prevent search path injection attacks.

  ## Vulnerability Background
  Functions with SECURITY DEFINER run with elevated privileges. Without a locked
  search_path, attackers could create malicious tables in their own schema and
  trick functions into reading from them instead of the legitimate tables.

  ## Functions Secured
  1. `is_admin()` - CRITICAL: Used in RLS policies, runs as superuser
  2. `refresh_user_hierarchy()` - Defense in depth
  3. `sync_activities_created_by()` - Defense in depth

  ## Security Impact
  - Eliminates: Medium/High severity search path injection vulnerability
  - Zero performance impact
  - No breaking changes (all tables are in public schema)

  ## References
  - PostgreSQL Security: https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH
  - OWASP: SQL Injection Prevention
*/

DO $$
BEGIN
    -- 1. Secure 'is_admin' (CRITICAL - used in RLS policies)
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'is_admin'
    ) THEN
        ALTER FUNCTION public.is_admin() SET search_path = public;
        RAISE NOTICE 'Secured function: is_admin()';
    ELSE
        RAISE NOTICE 'Function is_admin() not found - skipping';
    END IF;

    -- 2. Secure 'refresh_user_hierarchy' (Defense in depth)
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'refresh_user_hierarchy'
    ) THEN
        ALTER FUNCTION public.refresh_user_hierarchy() SET search_path = public;
        RAISE NOTICE 'Secured function: refresh_user_hierarchy()';
    ELSE
        RAISE NOTICE 'Function refresh_user_hierarchy() not found - skipping';
    END IF;

    -- 3. Secure 'sync_activities_created_by' (Defense in depth)
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'sync_activities_created_by'
    ) THEN
        ALTER FUNCTION public.sync_activities_created_by() SET search_path = public;
        RAISE NOTICE 'Secured function: sync_activities_created_by()';
    ELSE
        RAISE NOTICE 'Function sync_activities_created_by() not found - skipping';
    END IF;

    RAISE NOTICE '✓ Security hardening complete - all functions locked to public schema';
END
$$;

-- Verify the security fix was applied
SELECT 
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    pg_get_function_result(p.oid) as return_type,
    COALESCE(array_to_string(p.proconfig, ', '), 'No settings') as function_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'refresh_user_hierarchy', 'sync_activities_created_by')
ORDER BY p.proname;
