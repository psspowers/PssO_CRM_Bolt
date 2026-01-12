/*
  # Fix PostgreSQL Security Errors and Warnings

  ## Summary
  This migration addresses critical security issues flagged by the database linter:
  - 3 ERRORS: Views incorrectly using SECURITY DEFINER (invalid for views)
  - 4+ WARNINGS: Functions with mutable search paths (security vulnerability)

  ## Changes Made

  ### 1. Views Fixed (Remove SECURITY DEFINER)
  Views cannot use SECURITY DEFINER in PostgreSQL - this is only valid for functions.
  We drop and recreate the following views as standard views:
  
  - `connector_leaderboard`: Ranks users by relationship connections
  - `session_analytics`: Aggregates login statistics by day
  - `relationship_network`: Exposes relationship graph data
  
  All views are granted SELECT to authenticated users via RLS/grants.

  ### 2. Functions Secured (Fixed Search Path)
  Functions with SECURITY DEFINER and mutable search paths can be exploited.
  We lock down the search_path to 'public' on:
  
  - `update_market_news_updated_at()`
  - `update_market_news_interactions_updated_at()`
  - `update_feed_interactions_updated_at()`
  - `notify_deal_owners_on_news()`
  - `find_nexus_paths(uuid, uuid, int)`
  - `find_team_nexus_paths(uuid, int)`
  - `get_mw_hustle(timestamptz, timestamptz, uuid)`

  ## Security Impact
  - Prevents search path hijacking attacks on privileged functions
  - Removes invalid SECURITY DEFINER declarations from views
  - Maintains proper access control through RLS policies
*/

-- ============================================================================
-- PART 1: FIX VIEWS (Remove SECURITY DEFINER concept)
-- ============================================================================

DROP VIEW IF EXISTS public.session_analytics CASCADE;
DROP VIEW IF EXISTS public.relationship_network CASCADE;
DROP VIEW IF EXISTS public.connector_leaderboard CASCADE;

-- Recreate Connector Leaderboard (Standard View)
-- Ranks users by number of relationships they've created
CREATE OR REPLACE VIEW public.connector_leaderboard AS
SELECT 
  created_by as user_id, 
  COUNT(*) as connection_count
FROM entity_relationships
GROUP BY created_by;

GRANT SELECT ON public.connector_leaderboard TO authenticated;

-- Recreate Session Analytics (Standard View)
-- Aggregates login statistics by day
CREATE OR REPLACE VIEW public.session_analytics AS
SELECT 
  date_trunc('day', created_at) as date,
  count(*) as login_count,
  count(distinct user_id) as unique_users
FROM login_history
GROUP BY 1
ORDER BY date DESC;

GRANT SELECT ON public.session_analytics TO authenticated;

-- Recreate Relationship Network (Standard View)
-- Exposes relationship graph data for network analysis
CREATE OR REPLACE VIEW public.relationship_network AS
SELECT 
  from_entity_id, 
  to_entity_id, 
  relationship_type as type, 
  strength
FROM entity_relationships;

GRANT SELECT ON public.relationship_network TO authenticated;

-- ============================================================================
-- PART 2: FIX FUNCTIONS (Secure Search Path)
-- ============================================================================

-- Fix trigger functions for updated_at timestamps
ALTER FUNCTION public.update_market_news_updated_at() SET search_path = public;
ALTER FUNCTION public.update_market_news_interactions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_feed_interactions_updated_at() SET search_path = public;

-- Fix notification function
ALTER FUNCTION public.notify_deal_owners_on_news() SET search_path = public;

-- Fix Nexus pathfinding functions
ALTER FUNCTION public.find_nexus_paths(uuid, uuid, int) SET search_path = public;
ALTER FUNCTION public.find_team_nexus_paths(uuid, int) SET search_path = public;

-- Fix MW Hustle analytics function
ALTER FUNCTION public.get_mw_hustle(timestamptz, timestamptz, uuid) SET search_path = public;
