# Changelog

All notable changes to the PSS Orange CRM system are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-01-30

### Added

#### Task Master V2
- **X-Thread Design System**: Complete redesign with Twitter/X-inspired threaded task interface
- **Unified Task Stream**: Single chronological feed of all tasks across deals
- **Task Threading**: Rich conversations on tasks with replies and mentions
- **Priority System**: Visual priority indicators (Critical, High, Medium, Low)
- **Smart Filtering**: Filter by status, assignee, due date, and related entities
- **Activity Integration**: Tasks appear in main activity timeline

#### Velocity Dashboard
- **X-Feed Design**: Twitter/X-inspired feed layout for velocity metrics
- **Pipeline Analytics**: Stage-by-stage velocity analysis with heat maps
- **Historical Tracking**: Track velocity changes over time
- **Team Performance**: Compare velocity across team members
- **Bottleneck Detection**: Automatically identify slow-moving pipeline stages

#### Gamification System
- **Watts Currency**: Point system for tracking user contributions
- **Achievement Badges**: Unlock badges for milestones and activities
- **Leaderboard**: Real-time rankings of top contributors
- **Commission Tracking**: Integrated commission calculation based on deals won

#### The Pulse Enhancements
- **Market Intelligence Tab**: Dedicated tab for market news and insights
- **Analyst Console**: Smart rotation system for assigning accounts to analysts
- **Drip Feed System**: Gradually release imported news (40-60 min intervals)
- **Pinned Intel Box**: Favorite high-priority news items at top of feed
- **Critical Updates Box**: Automatic highlighting of opportunity/threat news
- **Read More/Less**: Expandable summaries for long-form content

#### Feature Additions
- **Bulk Import Wizard**: Smart CSV import with column mapping and validation
- **Enterprise Hierarchy**: Organizational reporting structure with subordinate visibility
- **Two-Factor Authentication**: TOTP-based 2FA with QR code generation
- **Email Templates**: Pre-built templates for confirmation, password reset, and welcome emails
- **Session Tracking**: Comprehensive logging of login, logout, and session events
- **Device Management**: View and manage trusted devices
- **Nexus Dossier**: Relationship intelligence with account interaction history
- **Account Metrics View**: Aggregated metrics for account health tracking

### Fixed

#### Critical Bugs
- **Avatar Upload Path Mismatch** (2026-01-03): Fixed UUID mismatch between `auth.users.id` and `crm_users.id` causing upload failures and session degradation
- **Contacts Foreign Keys** (2026-01-09): Added missing FK constraints for `account_id`, `partner_id`, and `owner_id` enabling relational queries
- **N+1 Query in Pulse Screen** (2026-01-10): Eliminated sequential queries (51 → 6 queries), ~85% performance improvement through batch fetching
- **Stage History Duplicate Triggers** (2026-01-06): Removed duplicate stage transition triggers causing double-logging
- **Analyst Rotation Null State** (2026-01-11): Fixed edge case when no accounts need scanning
- **Task Master Case Sensitivity** (2026-01-30): Fixed search and filtering case sensitivity issues
- **Market News Notification Trigger** (2026-01-14): Fixed ambiguous column references in trigger function
- **Activity Assignment FK** (2026-01-20): Corrected foreign key constraint for activity assignments
- **Contact Logging Orphans** (2026-01-21): Skip activity logging for contacts without accounts
- **Project Auto-Creation Hanging** (2026-01-04): Fixed deadlock in opportunity → project trigger

#### Security Fixes
- **RLS Policy Gaps** (2026-01-07): Closed 15+ security vulnerabilities in row-level security policies
- **Function Search Path** (2026-01-07): Set explicit `search_path` on all database functions (security definer)
- **Media Vault RLS** (2026-01-20): Fixed file access policies for media vault
- **Duplicate Permissive Policies** (2026-01-07): Removed duplicate and overly permissive policies
- **Super Admin Access Restoration** (2026-01-07): Fixed policies blocking super admin access

### Changed

#### UI/UX Improvements
- **Session Management (ClickUp-Style)** (2026-01-14):
  - Extended default session from 3 hours to 30 days
  - Added activity-based auto-refresh (hourly if active)
  - Reduced warning time to last 5 minutes only
  - Removed "Remember Me" checkbox (30 days now default)
  - Seamless experience with minimal interruptions

- **Deals Screen UI** (2026-01-09): Reverted to Tesla-inspired clean design with simplified card layout

- **Sticky Header Implementation** (2026-01-21):
  - Global sticky header across all screens
  - Increased z-index to `z-50` for proper layering
  - Removed duplicate sticky header from PulseScreen
  - GPU-accelerated positioning

- **QuickAdd Modal Enhancement** (2026-01-21):
  - Added `initialData` prop for pre-filling form fields
  - Context-aware task creation from news items
  - Automatic entity linking
  - Backward compatible with existing usage

#### Database Changes
- **Unified Opportunity Stages** (2026-01-01): Standardized sales pipeline stages (Prospect → Qualified → Proposal → Negotiation → Term Sheet → Won/Lost)
- **Project Auto-Creation** (2026-01-02): Automatic project generation when opportunities reach "Won" stage
- **Stage History Tracking** (2026-01-04): Comprehensive tracking of opportunity stage transitions with timestamps
- **Commission Schema** (2026-01-22): Added tables for commission tracking and payout management
- **Task Threading Schema** (2026-01-29): Added support for threaded task conversations
- **Watts Ledger** (2026-01-27): Point tracking system for gamification
- **News Interactions** (2026-01-12): User interaction tracking for market news (favorites, reads, hides)

#### Performance Improvements
- **Account Fetch Optimization** (2026-01-09): Eliminated redundant queries in account detail loading
- **Pipeline Velocity Caching** (2026-01-02): Added caching layer for velocity calculations
- **Pulse Screen Refactor** (2026-01-10): Batch fetching reduced query count by 85%
- **Feed Interactions** (2026-01-12): Optimized activity feed loading with pagination

### Deprecated
- **Partners Table** (2026-01-28): Partners functionality merged into unified Accounts table
- **Legacy Opportunity Stages** (2026-01-01): Old stage names no longer supported
- **Short Sessions** (2026-01-14): 3-hour sessions replaced by 30-day default

### Removed
- **Remember Me Checkbox** (2026-01-14): Removed from login screen (30-day sessions now automatic)
- **Duplicate Sticky Header** (2026-01-21): Removed screen-specific sticky headers in favor of global header
- **Hunter.io Integration Noise** (2026-01-12): Removed unused Hunter.io data causing feed clutter

---

## [1.1.0] - 2026-01-10

### Added
- **The Pulse**: Unified activity feed with two tabs (Activity Feed + Market Intel)
- **Nexus**: Relationship mapping and network visualization
- **Pipeline Velocity**: Basic velocity tracking and analytics
- **Admin Panel**: User management, org chart, activity logs
- **Role System**: Super Admin, Admin, Internal, External roles
- **Hierarchical Visibility**: Managers see subordinate data automatically

### Fixed
- **Session Timeout Issues** (2026-01-06):
  - Extended session timeout (1 hour → 3 hours base)
  - Increased warning time (5 min → 10 min)
  - Added session event tracking
- **Environment Stability** (2026-01-09): Fixed production deployment issues
- **Auto-Logout Analysis** (2026-01-08): Identified and resolved aggressive timeout settings

### Changed
- **Database Schema**: Major migration to unified CRM structure
- **Authentication Flow**: Enhanced with 2FA support
- **Mobile Navigation**: Redesigned bottom navigation bar
- **Search Functionality**: Improved global search across all entities

---

## [1.0.0] - 2026-01-01

### Added
- **Initial Release**: PSS Orange CRM for renewable energy investment
- **Core Entities**: Opportunities, Accounts, Contacts, Projects
- **Activity Tracking**: Calls, meetings, emails, tasks
- **Media Vault**: Secure document storage and management
- **User Profiles**: Avatar uploads, profile settings
- **Dark Mode**: System-wide dark theme support
- **Responsive Design**: Mobile-first with desktop enhancements

### Security
- **Row-Level Security**: Comprehensive RLS policies on all tables
- **Supabase Authentication**: Email/password with secure session management
- **Storage Policies**: Secure file access with user isolation
- **Edge Functions**: Serverless functions for sensitive operations

---

## Version History Summary

| Version | Date | Key Features |
|---------|------|--------------|
| **1.2.0** | 2026-01-30 | Task Master V2, Velocity Dashboard, Gamification |
| **1.1.0** | 2026-01-10 | The Pulse, Nexus, Admin Panel, Session Improvements |
| **1.0.0** | 2026-01-01 | Initial Release, Core CRM Functionality |

---

## Breaking Changes

### Version 1.2.0
- **Partners → Accounts Migration**: All partner references now use accounts table. Update any custom integrations.
- **Opportunity Stage Names**: Stage names are now strictly enforced. Use new stage names in all API calls.

### Version 1.1.0
- **Role System**: User roles are now enforced. Update user records to include valid role values.
- **Session Duration**: Sessions now last 30 days by default. Update security policies if shorter duration required.

---

## Migration Notes

### From 1.1.0 to 1.2.0
1. Run database migrations in `supabase/migrations/`
2. Update environment variables (no changes required)
3. Clear browser cache to load new assets
4. Review and update any hardcoded stage names
5. Migrate partner references to accounts if using custom queries

### From 1.0.0 to 1.1.0
1. Apply all database migrations sequentially
2. Set up admin user with super_admin role
3. Configure user hierarchy in Admin Panel
4. Test RLS policies thoroughly before production use

---

## Support & Feedback

For issues, questions, or feature requests:
- Review documentation in `/docs/`
- Check common issues in User Guide
- Contact development team

---

**Maintained by:** PSS Orange Development Team
**Last Updated:** January 30, 2026
