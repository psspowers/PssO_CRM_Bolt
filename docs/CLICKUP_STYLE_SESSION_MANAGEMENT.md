# ClickUp-Style Session Management

**Implementation Date:** January 14, 2026

## Overview

The application now uses a modern, ClickUp-inspired session management system that prioritizes user experience while maintaining security.

## Key Features

### 1. Extended Session Duration
- **Default Session:** 30 days (not 3 hours)
- **Extended Session:** 90 days (with "Remember Me")
- **Rationale:** CRM work is episodic - users work in bursts across days/weeks

### 2. Activity-Based Auto-Refresh
- Tracks user activity (mouse, keyboard, clicks, scroll, touch)
- Silently refreshes session every hour if user is active
- No interruptions or modal pop-ups during normal use
- Seamless experience like ClickUp, Notion, Linear

### 3. Minimal Interruption
- Warning appears only in last **5 minutes** of session
- Friendly "Still there?" message (not alarming)
- Users rarely see this modal due to auto-refresh

### 4. Smart Activity Detection
- Records activity at most once every 10 seconds (throttled)
- Checks for refresh every 5 minutes
- Auto-refreshes if:
  - User was active in last 5 minutes
  - AND session hasn't been refreshed in the last hour

## Technical Implementation

### Session Configuration
```typescript
const SHORT_SESSION = 30 * 24 * 60 * 60;  // 30 days
const LONG_SESSION = 90 * 24 * 60 * 60;   // 90 days
const SESSION_WARNING_TIME = 5 * 60;      // 5 minutes
const ACTIVITY_REFRESH_INTERVAL = 60 * 60; // 1 hour
const ACTIVITY_CHECK_INTERVAL = 5 * 60;    // 5 minutes
```

### Activity Tracking
The system tracks these user interactions:
- Mouse movement
- Keyboard input
- Clicks
- Scrolling
- Touch events (mobile)

### Auto-Refresh Logic
```
Every 5 minutes:
  IF user was active in last 5 minutes
    AND session hasn't refreshed in last hour
  THEN refresh session silently
```

## User Experience

### Typical Workflow
1. User logs in → Session starts (30 or 90 days)
2. User works normally → Activity tracked in background
3. Every hour (if active) → Session auto-refreshes silently
4. User never sees timeout modal unless truly inactive for 29+ days

### Edge Cases
- **Long-running background work:** Activity detected, auto-refresh happens
- **User leaves tab open:** No activity, session expires after 30/90 days
- **Multiple tabs:** Each tab tracks activity independently
- **Mobile devices:** Touch events counted as activity

## Security Considerations

### Maintained Security Features
- Device tracking (users can see all logged-in devices)
- Session logging (all login/logout events tracked)
- Remote logout capability
- Suspicious activity detection
- Two-factor authentication support

### Why This Is Secure
1. **Device-based sessions:** Each device has its own session
2. **Activity verification:** Sessions only extend if user is active
3. **Reasonable duration:** 30 days is industry standard for business apps
4. **Audit trail:** All session events logged for compliance

## Comparison with Previous System

### Before (Aggressive)
- 3 hours without "Remember Me"
- Warning after 2h 50min
- Frequent interruptions
- User frustration

### After (ClickUp-style)
- 30 days minimum
- Warning after 29 days 23h 55min (if no activity)
- Virtually no interruptions
- Seamless experience

## Industry Benchmarks

| App | Default Session | Auto-Refresh | Warning |
|-----|-----------------|--------------|---------|
| **ClickUp** | 30 days | Yes | Minimal |
| **Notion** | 90 days | Yes | None |
| **Linear** | 30 days | Yes | Minimal |
| **Monday.com** | 14 days | Yes | Minimal |
| **Your App** | 30 days | Yes | 5 min before |

## Monitoring & Analytics

The system logs all session events:
- `login` - User signs in
- `logout` - User signs out manually
- `auto_logout` - Session expired (very rare now)
- `extend_session` - User clicked "Stay Signed In" on modal
- `forced_logout` - Admin action or security event

### Recommended Queries
```sql
-- Average session duration
SELECT AVG(session_duration_seconds) / 86400 as avg_days
FROM session_events
WHERE event_type IN ('logout', 'auto_logout')
AND created_at > NOW() - INTERVAL '30 days';

-- Auto-logout rate (should be very low)
SELECT
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as auto_logouts,
  COUNT(*) FILTER (WHERE event_type = 'logout') as manual_logouts,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'auto_logout') /
    NULLIF(COUNT(*), 0), 2) as auto_logout_percentage
FROM session_events
WHERE created_at > NOW() - INTERVAL '30 days';
```

## User Feedback Expected

### Positive Changes
- No more unexpected logouts during work
- Seamless experience across work sessions
- Can leave tabs open between meetings
- Mobile app stays logged in

### Edge Cases to Monitor
- Users who share devices (should manually log out)
- Public computers (30 days is still secure for business context)
- Users expecting instant logout (can manually sign out)

## Future Enhancements

### Potential Improvements
1. **IP-based security:** Shorter sessions on new IPs
2. **Location awareness:** Re-authenticate on location change
3. **Concurrent session limits:** Max 5 devices per user
4. **Step-up auth:** Re-verify for sensitive actions
5. **Idle detection:** More sophisticated activity tracking

### Not Recommended
- ❌ Reducing session duration (would hurt UX)
- ❌ Removing auto-refresh (would cause interruptions)
- ❌ Banking-style short sessions (wrong for CRM)

## Rollout Notes

### Immediate Effect
- All users benefit immediately
- No migration needed
- No user training required
- Existing sessions continue

### Communication
No announcement needed - users will simply notice they're no longer getting logged out during work. If asked:

> "We've improved our session management to be more flexible. You'll stay logged in longer and won't be interrupted during work. You can still log out manually anytime from your profile menu."

## Support

### Common Questions

**Q: Why am I no longer seeing timeout warnings?**
A: Your session now auto-refreshes based on activity, so you rarely need warnings.

**Q: Is this secure?**
A: Yes. We track devices, log all sessions, and only extend if you're actively using the app.

**Q: How do I log out?**
A: Click your profile picture → Sign Out. Always log out on shared computers.

**Q: What if I want to be logged out after 3 hours?**
A: You can manually log out anytime. For security, we recommend logging out on shared/public computers.

## Conclusion

This implementation brings modern session management to your CRM, matching industry leaders like ClickUp while maintaining enterprise-grade security. Users get a seamless experience, and the business gets better engagement and fewer support tickets about unexpected logouts.
