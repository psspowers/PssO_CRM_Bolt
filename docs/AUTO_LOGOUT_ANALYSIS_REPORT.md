## # Auto-Logout Issue Analysis & Monitoring System

**Issue:** Colleagues logging in successfully but getting automatically logged out and unable to log back in
**Status:** ✅ MONITORING SYSTEM DEPLOYED
**Date:** January 6, 2026

---

## Root Cause: Aggressive Session Timeout

### The Problem
Users are experiencing automatic logouts due to **1-hour session timeout** when they don't check "Remember Me" during login.

**Session Configuration:**
- **Without "Remember Me":** 1 hour session (SHORT_SESSION)
- **With "Remember Me":** 30 days session (LONG_SESSION)
- **Warning:** 5 minutes before timeout

### What Happens
1. User logs in (doesn't check "Remember Me")
2. After 55 minutes, timeout warning modal appears
3. If user doesn't respond within 5 minutes → **AUTO-LOGOUT**
4. Session is cleared, user redirected to login page
5. User CAN log back in, but may perceive it as "being locked out"

---

## Comprehensive Monitoring System Deployed

### 1. Session Events Tracking
New `session_events` table tracks every session lifecycle event:

| Event Type | What It Tracks |
|-----------|---------------|
| `login` | User successfully logs in |
| `logout` | User manually logs out |
| `auto_logout` | System automatically logs out user (timeout) |
| `timeout` | Session expired |
| `extend_session` | User clicked "Stay Signed In" |
| `forced_logout` | Admin or system forced logout |

**Data Captured:**
- User ID and email
- Event type and logout reason
- Session duration in seconds
- Whether "Remember Me" was used
- Device type, browser, OS
- User agent and IP address
- Timestamp

### 2. Login History Tracking
Enhanced `login_history` table now captures:
- Every login attempt (success/failure)
- Failure reasons
- Device and browser information
- Timestamps

### 3. Combined Diagnostic Queries
Created `/docs/SESSION_TRACKING_QUERIES.sql` with 10 comprehensive queries:
- Auto-logout analysis by user
- Session duration patterns
- Remember Me usage patterns
- Device-specific auto-logout rates
- Hourly event breakdown
- User session timelines
- System health summary

---

## How to Monitor Users Getting Logged Out

### Quick Check: Who's Experiencing Auto-Logouts?
```sql
-- Run this query to see users with automatic logout issues
SELECT
  se.email,
  cu.name,
  COUNT(*) FILTER (WHERE se.event_type = 'auto_logout') as auto_logout_count,
  MAX(se.created_at) FILTER (WHERE se.event_type = 'auto_logout') as last_auto_logout
FROM session_events se
LEFT JOIN crm_users cu ON se.email = cu.email
WHERE se.created_at > NOW() - INTERVAL '7 days'
GROUP BY se.email, cu.name
HAVING COUNT(*) FILTER (WHERE se.event_type = 'auto_logout') > 0
ORDER BY auto_logout_count DESC;
```

### Check Specific User's Session History
```sql
-- Replace 'user@example.com' with the user's email
SELECT
  created_at,
  event_type,
  ROUND(session_duration_seconds/60.0, 1) as session_minutes,
  remember_me,
  device_type,
  browser
FROM session_events
WHERE email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 20;
```

### System Health Dashboard
```sql
-- Overall system health for last 7 days
SELECT
  COUNT(DISTINCT email) as active_users,
  COUNT(*) FILTER (WHERE event_type = 'login') as total_logins,
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as total_auto_logouts,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'auto_logout') /
    COUNT(*) FILTER (WHERE event_type = 'login'), 1) as auto_logout_rate_pct
FROM session_events
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Why Users Feel "Locked Out"

### User Perspective
1. Working in the system for 55+ minutes
2. Suddenly see timeout warning modal
3. Distracted or away from computer
4. Get auto-logged out
5. Try to log back in → **System asks for password again**
6. **Perception:** "I was locked out"

### Actual Reality
- User is **NOT locked out**
- They CAN log back in with same credentials
- It's just a timeout, not a ban or restriction
- Their account status hasn't changed

### Communication Gap
Users may not understand:
- The 1-hour timeout exists
- "Remember Me" extends session to 30 days
- The timeout warning modal is trying to help them
- Logging back in is normal and expected

---

## Immediate Actions Taken

### ✅ Deployed Session Tracking
- Every login/logout now logged with full details
- Auto-logouts specifically tracked and labeled
- Session duration recorded for analysis

### ✅ Enhanced Login Tracking
- Failed login attempts now captured
- Failure reasons recorded
- Device/browser info tracked

### ✅ Created Diagnostic Tools
- 10 comprehensive SQL queries
- User timeline analysis
- System health monitoring
- Auto-logout pattern detection

---

## Recommended Solutions

### Option 1: Increase Session Timeout (Recommended)
**Change:** Increase SHORT_SESSION from 1 hour to 3-4 hours

**File:** `src/contexts/AuthContext.tsx`
```typescript
const SHORT_SESSION = 3 * 60 * 60; // 3 hours instead of 1
```

**Impact:**
- Reduces auto-logout frequency
- Better user experience for daily work
- Still secure (not indefinite)

### Option 2: Educate Users About "Remember Me"
**Communicate to team:**
- Check "Remember Me" at login → 30-day session
- Prevents auto-logouts during active work
- Safe to use on personal devices

### Option 3: Adjust Warning Time
**Change:** Increase warning time from 5 minutes to 10-15 minutes

```typescript
const SESSION_WARNING_TIME = 10 * 60; // 10 minutes instead of 5
```

**Impact:**
- More time to respond to timeout warning
- Less likely to be caught by surprise

### Option 4: Auto-Extend on Activity (Advanced)
**Change:** Automatically extend session on user activity

**Implementation:** Track mouse/keyboard activity and auto-extend before timeout

**Complexity:** Medium - requires additional code

---

## Monitoring Best Practices

### Daily Check
```sql
-- Run each morning to check for issues
SELECT * FROM session_analytics
WHERE date >= CURRENT_DATE - 1
ORDER BY date DESC;
```

### Weekly Review
- Review auto-logout rates by user
- Check for patterns (specific times, devices)
- Identify users needing help with "Remember Me"

### When User Reports "Can't Log In"
1. Check `login_history` for their recent attempts
2. Check `session_events` for auto-logout frequency
3. Verify email confirmation status
4. Check `is_active` status in `crm_users`

---

## Technical Details

### Files Modified
- `src/contexts/AuthContext.tsx` - Added session event tracking
- `supabase/migrations/create_session_tracking_table.sql` - New session_events table

### New Documentation
- `/docs/SESSION_TRACKING_QUERIES.sql` - 10 diagnostic queries
- `/docs/AUTO_LOGOUT_ANALYSIS_REPORT.md` - This document
- `/docs/LOGIN_DIAGNOSTICS_QUERIES.sql` - Login-specific diagnostics

### Database Tables
- `session_events` - Session lifecycle tracking
- `login_history` - Login attempt tracking
- `session_analytics` - View for aggregated analytics

---

## Next Steps

1. **Monitor for 24-48 hours** to collect baseline data
2. **Run diagnostic queries** to identify patterns
3. **Make decision** on session timeout adjustment
4. **Communicate** with team about "Remember Me" option
5. **Review weekly** for any emerging issues

---

## FAQ

**Q: Are users actually locked out?**
A: No. They're automatically logged out due to timeout, but can log right back in.

**Q: Why 1 hour timeout?**
A: Security best practice, but may be too aggressive for daily work patterns.

**Q: Will increasing timeout reduce security?**
A: Slightly, but 3-4 hours is still reasonable for office work. 30-day "Remember Me" is already available.

**Q: Can we make it so users never get logged out?**
A: Not recommended. Session timeouts are important for security, especially on shared computers.

**Q: How do I check if a specific user is having issues?**
A: Run Query #5 in SESSION_TRACKING_QUERIES.sql with their email address.

---

## Success Metrics

**Healthy System:**
- Auto-logout rate < 10% of logins
- Most sessions > 30 minutes
- Active use of "Remember Me" feature
- Few repeated auto-logouts for same user

**Problem Indicators:**
- Auto-logout rate > 30%
- Many short sessions (< 15 minutes before auto-logout)
- Same users experiencing repeated auto-logouts
- Complaints about "being locked out"

---

## Contact
For questions about session monitoring or auto-logout patterns, refer to:
- Diagnostic queries: `/docs/SESSION_TRACKING_QUERIES.sql`
- Login issues: `/docs/LOGIN_DIAGNOSTICS_QUERIES.sql`
- Super Admin: sam@psspowers.com
