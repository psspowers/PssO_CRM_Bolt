-- ========================================
-- SESSION TRACKING & AUTO-LOGOUT DIAGNOSTICS
-- ========================================
-- Use these queries to diagnose automatic logout issues and monitor session health

-- 1. AUTO-LOGOUT ANALYSIS - Find users experiencing automatic logouts
SELECT
  se.email,
  cu.name,
  cu.role,
  COUNT(*) FILTER (WHERE se.event_type = 'auto_logout') as auto_logout_count,
  COUNT(*) FILTER (WHERE se.event_type = 'logout') as manual_logout_count,
  COUNT(*) FILTER (WHERE se.event_type = 'login') as login_count,
  COUNT(*) FILTER (WHERE se.event_type = 'extend_session') as session_extensions,
  ROUND(AVG(se.session_duration_seconds) FILTER (WHERE se.event_type IN ('auto_logout', 'logout'))/60, 1) as avg_session_minutes,
  MAX(se.created_at) FILTER (WHERE se.event_type = 'auto_logout') as last_auto_logout,
  CASE
    WHEN COUNT(*) FILTER (WHERE se.event_type = 'auto_logout') > 3 THEN '🚨 High Auto-Logout Rate'
    WHEN COUNT(*) FILTER (WHERE se.event_type = 'auto_logout') > 0 THEN '⚠️ Some Auto-Logouts'
    ELSE '✅ Normal'
  END as status
FROM session_events se
LEFT JOIN crm_users cu ON se.email = cu.email
WHERE se.created_at > NOW() - INTERVAL '7 days'
GROUP BY se.email, cu.name, cu.role
HAVING COUNT(*) FILTER (WHERE se.event_type = 'auto_logout') > 0
ORDER BY auto_logout_count DESC;


-- 2. SESSION DURATION PATTERNS - Understand how long users stay logged in
SELECT
  CASE
    WHEN session_duration_seconds < 300 THEN '< 5 min'
    WHEN session_duration_seconds < 900 THEN '5-15 min'
    WHEN session_duration_seconds < 1800 THEN '15-30 min'
    WHEN session_duration_seconds < 3600 THEN '30-60 min'
    WHEN session_duration_seconds < 7200 THEN '1-2 hours'
    ELSE '> 2 hours'
  END as session_length,
  COUNT(*) as session_count,
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as auto_logout_count,
  COUNT(*) FILTER (WHERE event_type = 'logout') as manual_logout_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'auto_logout') / COUNT(*), 1) as auto_logout_pct
FROM session_events
WHERE event_type IN ('logout', 'auto_logout', 'timeout')
  AND session_duration_seconds IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY
  CASE
    WHEN session_duration_seconds < 300 THEN '< 5 min'
    WHEN session_duration_seconds < 900 THEN '5-15 min'
    WHEN session_duration_seconds < 1800 THEN '15-30 min'
    WHEN session_duration_seconds < 3600 THEN '30-60 min'
    WHEN session_duration_seconds < 7200 THEN '1-2 hours'
    ELSE '> 2 hours'
  END
ORDER BY
  CASE session_length
    WHEN '< 5 min' THEN 1
    WHEN '5-15 min' THEN 2
    WHEN '15-30 min' THEN 3
    WHEN '30-60 min' THEN 4
    WHEN '1-2 hours' THEN 5
    ELSE 6
  END;


-- 3. REMEMBER ME USAGE - Check if users are using remember me
SELECT
  remember_me,
  COUNT(*) as login_count,
  COUNT(DISTINCT email) as unique_users,
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as auto_logout_count,
  ROUND(AVG(session_duration_seconds) FILTER (WHERE event_type IN ('auto_logout', 'logout'))/3600, 2) as avg_session_hours
FROM session_events
WHERE event_type = 'login'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY remember_me
ORDER BY remember_me;


-- 4. RECENT SESSION EVENTS - Timeline view of all session events
SELECT
  se.created_at,
  se.email,
  cu.name,
  se.event_type,
  se.logout_reason,
  ROUND(se.session_duration_seconds/60.0, 1) as session_minutes,
  se.remember_me,
  se.device_type,
  se.browser,
  CASE
    WHEN se.event_type = 'auto_logout' THEN '🔴 Auto Logged Out'
    WHEN se.event_type = 'logout' THEN '🟢 Manual Logout'
    WHEN se.event_type = 'login' THEN '🔵 Logged In'
    WHEN se.event_type = 'extend_session' THEN '🟡 Extended Session'
    ELSE '⚪ ' || se.event_type
  END as event_description
FROM session_events se
LEFT JOIN crm_users cu ON se.email = cu.email
WHERE se.created_at > NOW() - INTERVAL '24 hours'
ORDER BY se.created_at DESC
LIMIT 50;


-- 5. USER SESSION TIMELINE - Detailed view for specific user
-- Replace 'user@example.com' with actual email
SELECT
  created_at,
  event_type,
  logout_reason,
  ROUND(session_duration_seconds/60.0, 1) as session_minutes,
  remember_me,
  device_type,
  browser,
  os
FROM session_events
WHERE email = 'user@example.com'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;


-- 6. USERS WITH REPEATED AUTO-LOGOUT ISSUES
-- These users need attention - they're getting kicked out frequently
WITH user_issues AS (
  SELECT
    email,
    COUNT(*) FILTER (WHERE event_type = 'auto_logout') as auto_logout_count,
    COUNT(*) FILTER (WHERE event_type = 'login') as login_count,
    MAX(created_at) as last_event,
    ARRAY_AGG(DISTINCT device_type) as devices_used
  FROM session_events
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY email
)
SELECT
  ui.email,
  cu.name,
  cu.role,
  ui.auto_logout_count,
  ui.login_count,
  ui.last_event,
  ui.devices_used,
  CASE
    WHEN ui.auto_logout_count::float / ui.login_count > 0.5 THEN '🔴 Critical - >50% auto-logout rate'
    WHEN ui.auto_logout_count > 3 THEN '🟠 High - Multiple auto-logouts'
    ELSE '🟡 Moderate'
  END as severity
FROM user_issues ui
LEFT JOIN crm_users cu ON ui.email = cu.email
WHERE ui.auto_logout_count >= 2
ORDER BY ui.auto_logout_count DESC, ui.login_count DESC;


-- 7. SESSION EXTENSION PATTERNS - Who's actively extending sessions
SELECT
  se.email,
  cu.name,
  COUNT(*) FILTER (WHERE se.event_type = 'extend_session') as extensions_count,
  COUNT(*) FILTER (WHERE se.event_type = 'login') as login_count,
  COUNT(*) FILTER (WHERE se.event_type = 'auto_logout') as auto_logout_count,
  MAX(se.created_at) as last_activity,
  CASE
    WHEN COUNT(*) FILTER (WHERE se.event_type = 'extend_session') > 5 THEN '💪 Very Active - Frequently extends'
    WHEN COUNT(*) FILTER (WHERE se.event_type = 'extend_session') > 0 THEN '✅ Active - Uses extension'
    ELSE '⚠️ Never extends - May experience timeouts'
  END as engagement
FROM session_events se
LEFT JOIN crm_users cu ON se.email = cu.email
WHERE se.created_at > NOW() - INTERVAL '7 days'
GROUP BY se.email, cu.name
ORDER BY extensions_count DESC;


-- 8. DEVICE-SPECIFIC AUTO-LOGOUT RATE
-- Check if certain devices/browsers have higher auto-logout rates
SELECT
  device_type,
  browser,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as auto_logout_count,
  COUNT(*) FILTER (WHERE event_type = 'login') as login_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'auto_logout') / NULLIF(COUNT(*) FILTER (WHERE event_type = 'login'), 0), 1) as auto_logout_rate_pct
FROM session_events
WHERE created_at > NOW() - INTERVAL '7 days'
  AND event_type IN ('login', 'auto_logout')
GROUP BY device_type, browser
HAVING COUNT(*) FILTER (WHERE event_type = 'login') > 0
ORDER BY auto_logout_rate_pct DESC NULLS LAST;


-- 9. HOURLY SESSION EVENT BREAKDOWN
-- Identify peak times for auto-logouts
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) FILTER (WHERE event_type = 'login') as logins,
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as auto_logouts,
  COUNT(*) FILTER (WHERE event_type = 'logout') as manual_logouts,
  COUNT(*) FILTER (WHERE event_type = 'extend_session') as extensions
FROM session_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;


-- 10. SESSION HEALTH SUMMARY - Overall system health
SELECT
  DATE_TRUNC('day', created_at)::date as date,
  COUNT(DISTINCT email) as active_users,
  COUNT(*) FILTER (WHERE event_type = 'login') as total_logins,
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as total_auto_logouts,
  COUNT(*) FILTER (WHERE event_type = 'extend_session') as total_extensions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'auto_logout') /
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'login'), 0), 1) as auto_logout_rate_pct,
  ROUND(AVG(session_duration_seconds) FILTER (WHERE event_type IN ('auto_logout', 'logout'))/60, 1) as avg_session_minutes,
  CASE
    WHEN COUNT(*) FILTER (WHERE event_type = 'auto_logout')::float / NULLIF(COUNT(*) FILTER (WHERE event_type = 'login'), 0) > 0.3 THEN '🔴 Unhealthy - High auto-logout rate'
    WHEN COUNT(*) FILTER (WHERE event_type = 'auto_logout')::float / NULLIF(COUNT(*) FILTER (WHERE event_type = 'login'), 0) > 0.1 THEN '🟡 Warning - Elevated auto-logout rate'
    ELSE '🟢 Healthy'
  END as system_health
FROM session_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at)::date
ORDER BY date DESC;


-- ========================================
-- RECOMMENDED ACTIONS BASED ON PATTERNS
-- ========================================

-- If auto-logout rate > 30%:
--   - Consider increasing SHORT_SESSION timeout from 1 hour to 2-4 hours
--   - Check if network issues are causing token refresh failures
--   - Review session timeout modal behavior

-- If specific users have high auto-logout rates:
--   - Check their device/browser combinations
--   - Verify they're not on unstable networks
--   - Ensure they understand "Remember Me" option

-- If auto-logouts happen at specific times:
--   - Check for deployment/maintenance windows
--   - Look for infrastructure issues during those times
