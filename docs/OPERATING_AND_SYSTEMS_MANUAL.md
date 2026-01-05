# CRM Operating and Systems Manual

**Version:** 1.1
**Last Updated:** January 5, 2026
**System Name:** Enterprise CRM for Renewable Energy Investment
**Target Industry:** Solar PV / Renewable Energy Project Finance

---

## Visual Assets Note

This manual includes ASCII diagrams for key workflows and system architecture. For a production version, consider adding actual screenshots at these locations:

- Section 2.3: Screenshot of main dashboard layout
- Section 2.3.1: Screenshot of mobile bottom navigation
- Section 4.2: Screenshot of 2FA setup QR code screen
- Section 5.1.3: Screenshot of Quality Gate checklist interface
- Section 5.1.6: Screenshot of Mine/Team toggle and hierarchical view
- Section 5.1.7: Screenshot of stage history audit trail
- Section 6.1: Screenshot of Classic Dashboard with real data
- Section 6.2: Screenshot of Velocity Dashboard charts
- Section 7.1: Screenshot of Media Vault file browser
- Section 7.2: Screenshot of Network Graph visualization
- Section 7.4: Screenshots of each Bulk Import Wizard step
- Section 8.1.5: Screenshot of interactive Org Chart

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Authentication and Security](#4-authentication-and-security)
5. [Core Modules](#5-core-modules)
6. [Dashboard Views](#6-dashboard-views)
7. [Advanced Features](#7-advanced-features)
8. [Administrative Functions](#8-administrative-functions)
9. [Data Management](#9-data-management)
10. [Best Practices](#10-best-practices)
11. [Troubleshooting](#11-troubleshooting)
12. [Technical Architecture](#12-technical-architecture)
13. [Glossary](#13-glossary)

---

## 1. System Overview

### 1.1 Purpose

This CRM system is purpose-built for renewable energy investment firms managing solar PV projects, Power Purchase Agreements (PPAs), and counterparty relationships across Thailand and Southeast Asia. The system streamlines deal flow management from origination through execution, with built-in underwriting workflows aligned with institutional investment committee processes.

### 1.2 Key Capabilities

- **Deal Pipeline Management**: Track opportunities from prospect to PPA execution
- **Counterparty Risk Management**: Credit evaluation and due diligence workflows
- **Relationship Mapping**: Visualize professional networks and stakeholder connections
- **Investment Committee Workflows**: Quality gates aligned with IC approval stages
- **Project Portfolio Tracking**: Monitor active projects and capacity deployment
- **Secure Document Management**: Media vault with GPS verification for site visits
- **Pipeline Velocity Analytics**: Real-time metrics on deal flow and conversion rates
- **Thai Sector Taxonomy Integration**: Industry-specific classification system

### 1.3 Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth with 2FA support
- **File Storage**: Supabase Storage with signed URLs
- **State Management**: React Context API
- **Data Fetching**: TanStack Query

---

## 2. Getting Started

### 2.1 System Access

**URL**: Your deployment URL (typically `https://your-domain.com`)

**Supported Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Device Compatibility**:
- Desktop (optimized for 1920x1080)
- Tablet (responsive breakpoints at 768px and 1024px)
- Mobile (iOS Safari, Chrome Android)

### 2.2 First-Time Login

1. Navigate to the login page
2. Enter your company email address
3. Enter your temporary password (provided by administrator)
4. If 2FA is enabled for your account, complete verification
5. You will be prompted to change your password on first login
6. Complete your profile setup (avatar, phone number, preferred settings)

### 2.3 User Interface Overview

**Navigation Components**:

- **Top Header**: Logo, search bar, notifications, user menu
- **Left Sidebar** (Desktop): Main navigation tabs with icon + label
- **Bottom Nav** (Mobile): Compact navigation for 5 primary sections
- **Quick Add Button**: Floating action button (+ icon) for rapid data entry

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  [Search Bar.................] [🔔] [👤 User Menu ▾]   │
├──────┬──────────────────────────────────────────────────────────┤
│      │                                                           │
│ 🏠   │                 Main Content Area                        │
│ Home │                                                           │
│      │   ┌─────────────────────────────────────────────┐       │
│ 🎯   │   │  Dashboard / List View / Detail View        │       │
│ Opps │   │                                              │       │
│      │   │                                              │       │
│ 🏢   │   │                                              │       │
│ Acct │   │           (Dynamic content loads here)       │       │
│      │   │                                              │       │
│ 👥   │   │                                              │       │
│ Cont │   └─────────────────────────────────────────────┘       │
│      │                                                           │
│ 🤝   │                                            [➕ Quick Add] │
│ Part │                                                           │
│      │                                                           │
└──────┴──────────────────────────────────────────────────────────┘
```

**Main Navigation Tabs**:

1. **Home**: Dashboard and analytics
2. **Opportunities**: Deal pipeline management
3. **Accounts**: Company/counterparty database
4. **Contacts**: Individual stakeholder directory
5. **Partners**: EPC contractors, O&M providers, technology partners
6. **Projects**: Active project portfolio
7. **Activities**: Timeline of calls, meetings, notes
8. **Tasks**: Action items and follow-ups

### 2.3.1 Mobile Bottom Navigation

**Purpose**: Optimized navigation for mobile devices with thumb-reachable controls and minimalist design.

**Design Philosophy**:
- Icon-only labels (no text) for clean appearance
- Larger touch targets meeting accessibility standards (44px+ minimum)
- Active state visual indicators (colored icon + dot below)
- Elevated Magic button with pulse animation for discoverability
- Grid-based layout for consistent spacing

**Mobile Navigation Layout**:
```
┌────────────────────────────────────────────────────────┐
│                 Main Content Area                      │
│                    (scrollable)                        │
│                                                        │
│                                                        │
│                                                        │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  🏠     🎯     🏢     👥     🤝     📊     🗂️     ⭐    │
│  •                                                     │
│                                                        │
│                    [✨ Magic Menu]                     │
└────────────────────────────────────────────────────────┘
```

**Navigation Icons** (Left to Right):
1. **🏠 Home** (House icon): Dashboard
2. **🎯 Opportunities** (Target icon): Deal pipeline
3. **🏢 Accounts** (Building icon): Companies
4. **👥 Contacts** (Users icon): People
5. **🤝 Partners** (Handshake icon): EPC/O&M/Tech
6. **📊 Projects** (Folders icon): Active projects
7. **🗂️ Activities** (File Stack icon): Call logs
8. **⭐ Tasks** (Star icon): Action items

**Active State Indicators**:
- **Icon Color**: Changes to brand orange (`text-orange-500`)
- **Icon Size**: Slightly larger (28px vs 24px)
- **Dot Indicator**: Small orange dot appears below active icon
- **Background**: Subtle gray background on tap

**Magic Button**:
- **Position**: Center of bottom navigation, elevated 12px above nav bar
- **Design**: Circular button with gradient background
- **Animation**: Subtle pulse effect (scale 105% → 100% loop)
- **Icon**: Sparkles (✨) suggesting AI or special actions
- **Function**: Opens quick action menu (Quick Add + AI features)

**Touch Optimization**:
- Minimum tap target: 44px × 44px (WCAG AAA compliance)
- Spacing between icons: 16px minimum
- Bottom safe area padding: Automatic iOS/Android notch handling
- Haptic feedback on tap (iOS only)

**Responsive Behavior**:
- **Mobile** (< 1024px): Bottom navigation visible, sidebar hidden
- **Tablet/Desktop** (≥ 1024px): Bottom navigation hidden, sidebar visible
- **Orientation Change**: Layout adapts instantly without page reload

**Usage Best Practices**:
- Use thumb for navigation (designed for one-handed operation)
- Swipe down from top to access search and notifications
- Tap Magic button for quick record creation
- Active dot helps you remember which section you're in

**Accessibility**:
- Each icon has aria-label for screen readers
- High contrast icons (4.5:1 minimum)
- Focus indicators for keyboard navigation (tablet mode)
- Reduced motion option disables pulse animation

---

## 3. User Roles and Permissions

### 3.1 Role Hierarchy

The system implements a four-tier role-based access control (RBAC) model:

```
    ┌─────────────────────┐
    │   SUPER ADMIN       │  ← Only ONE per system
    │   (Full Access)     │     Override capabilities
    └──────────┬──────────┘
               │
    ┌──────────┴──────────┐
    │      ADMIN          │  ← Multiple allowed
    │  (High-level Mgmt)  │     User management
    └──────────┬──────────┘
               │
    ┌──────────┴──────────┐
    │     INTERNAL        │  ← Company employees
    │  (Full CRM access)  │     Create/edit entities
    └──────────┬──────────┘
               │
    ┌──────────┴──────────┐
    │     EXTERNAL        │  ← Partners, consultants
    │  (Limited visibility)│     View-only shared data
    └─────────────────────┘
```

#### **Super Admin**
- **Unique**: Only ONE super admin allowed per system
- **Access Level**: Full system access with override capabilities
- **Permissions**:
  - Create, edit, delete all users including admins
  - Access all data across all entities regardless of ownership
  - Configure system settings and security policies
  - View and manage activity logs
  - Reset passwords for any user
  - Assign/change user roles
  - Access admin panel and organizational chart

#### **Admin**
- **Access Level**: High-level management
- **Permissions**:
  - Create, edit, delete internal and external users
  - View organizational charts and team structure
  - Access activity logs (read-only)
  - Manage company-wide settings
  - View all internal user data
  - Cannot modify super admin or other admin roles
  - Cannot delete the super admin

#### **Internal** (Default for company email domains)
- **Access Level**: Full CRM functionality
- **Permissions**:
  - Create, edit, delete: Opportunities, Accounts, Contacts, Partners, Projects
  - Full access to own activities and entities
  - View other internal users' public data
  - Create and manage relationships
  - Upload to media vault
  - Access pipeline analytics and velocity dashboard
  - Use bulk import wizard
  - Participate in organizational hierarchy

#### **External** (Partners, consultants, external stakeholders)
- **Access Level**: Limited visibility
- **Permissions**:
  - View only: Entities explicitly shared with them
  - Cannot see internal user data
  - Cannot access admin functions
  - Cannot export data
  - Cannot use bulk import
  - Limited notification access

### 3.2 Role Assignment

**Automatic Assignment**:
- Users with company email domain (e.g., `@yourcompany.com`) → `Internal`
- Users with external email domains → `External`

**Manual Override**:
- Super Admin or Admin can manually change any user's role
- Access: Admin Panel → User Management → Edit User → Role dropdown

### 3.3 Data Visibility Rules

**Row-Level Security (RLS)**:
- Internal users can view/edit entities they created or are assigned to
- External users can only view entities explicitly linked to their user ID
- Admins can view all entities
- Super Admin has unrestricted access

**Automatic Relationships**:
- When a user creates an entity (opportunity, account, etc.), they are automatically set as the owner
- Ownership can be transferred by changing the `assignedTo` field
- Hierarchical visibility: Managers can view direct reports' entities

---

## 4. Authentication and Security

### 4.1 Login Process

**Standard Login Flow**:
```
┌─────────────────────────────────────────────────────┐
│  STEP 1: Login Screen                               │
│  ┌───────────────────────────────────────────────┐ │
│  │ Email: [________________]                     │ │
│  │ Password: [________________]                  │ │
│  │ ☐ Remember Me                                 │ │
│  │ [  Sign In  ]                                 │ │
│  └───────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  STEP 2: 2FA Verification (if enabled)              │
│  ┌───────────────────────────────────────────────┐ │
│  │ Enter 6-digit code:  [______]                 │ │
│  │ [  Verify  ]                                  │ │
│  └───────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  STEP 3: Password Change (if first login)           │
│  ┌───────────────────────────────────────────────┐ │
│  │ New Password: [________________]              │ │
│  │ Confirm: [________________]                   │ │
│  │ [  Set Password  ]                            │ │
│  └───────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  SUCCESS: Redirect to Dashboard                     │
│  Session Duration: 1 hour (or 30 days if checked)   │
└─────────────────────────────────────────────────────┘
```

**Remember Me**:
- **Checked**: 30-day session
- **Unchecked**: 1-hour session

### 4.2 Two-Factor Authentication (2FA)

**Purpose**: Additional security layer for sensitive roles (recommended for Admin/Super Admin)

**Setup Process**:
1. Navigate to: Settings → Security → Two-Factor Authentication
2. Choose method:
   - **Email OTP**: 6-digit code sent to your email
   - **Authenticator App**: TOTP using Google Authenticator, Authy, etc.
3. For Authenticator App:
   - Scan the QR code displayed
   - Enter the 6-digit verification code
   - Save recovery codes in a secure location
4. 2FA is now active

**Login with 2FA**:
```
1. Enter email and password
2. 2FA verification screen appears
3. Enter 6-digit code from authenticator app OR click "Send Code" for email
4. Code valid for 5 minutes
5. Access granted upon successful verification
```

**Recovery**:
- If you lose access to your 2FA device, contact an administrator
- Admins can disable 2FA for a user: Admin Panel → Edit User → Disable 2FA

### 4.3 Password Requirements

**Minimum Standards**:
- 8 characters minimum
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@, #, $, %, etc.)

**Password Change**:
- First login: Forced password change
- Regular change: Profile → Change Password
- Admin-initiated reset: User receives email with reset link

### 4.4 Session Management

**Active Session Monitoring**:
- System tracks device information (browser, OS, IP address)
- View active sessions: Settings → Security → Trusted Devices

**Session Timeout**:
- 5 minutes of inactivity → Warning modal appears
- User can click "Stay Logged In" to extend
- No response → Automatic logout

**Logout**:
- Manual: Click user avatar → "Logout"
- Automatic: Session expiration, inactivity timeout
- All logout events are logged in activity logs

### 4.5 Trusted Devices

**Purpose**: Track and manage devices that have accessed your account

**View Devices**:
1. Settings → Security → Trusted Devices
2. See list of devices with:
   - Device type (mobile, tablet, desktop)
   - Browser and OS information
   - Last access date
   - Location (if available)

**Remove Device**:
- Click "Remove" next to any device
- Forces re-authentication on that device's next login attempt

### 4.6 Security Best Practices

1. **Enable 2FA** for all admin and internal users
2. **Use strong, unique passwords** (consider a password manager)
3. **Logout** when using shared computers
4. **Review trusted devices** monthly
5. **Report suspicious activity** to your administrator immediately
6. **Never share credentials** with colleagues (use proper user accounts)
7. **Keep recovery codes** for 2FA in a secure offline location

---

## 5. Core Modules

### 5.1 Opportunities (Deal Pipeline)

**Purpose**: Manage investment opportunities from origination through PPA execution.

#### 5.1.1 Creating an Opportunity

**Quick Add**:
1. Click the "+" floating button
2. Select "Opportunity"
3. Fill required fields:
   - **Company Name**: Counterparty name
   - **Value**: Deal size in THB (e.g., 50000000 for ฿50M)
   - **Stage**: Current pipeline stage (default: Prospect)
   - **Renewable Energy Type**: Solar PV, Wind, Hybrid, etc.
4. Click "Create"

**Full Form**:
- Navigate to: Opportunities → "New Opportunity" button
- Complete all available fields:

**Essential Fields**:
- **Company Name**: Legal name of counterparty
- **Value**: Total project value (THB)
- **Stage**: Prospect → Qualified → Proposal → Negotiation → Term Sheet → Won
- **RE Type**: Solar PV, Wind, Hybrid, Energy Storage (BESS), Biomass
- **Priority**: Low, Medium, High, Critical
- **Industry**: Manufacturing, Hospitality, Data Center, etc. (Thai taxonomy)
- **Location**: Province or region in Thailand

**Advanced Fields**:
- **Capacity (MW)**: Expected installed capacity
- **Win Probability (%)**: Estimated likelihood of closing
- **Expected Close Date**: Target PPA execution date
- **Linked Account**: Associate with existing account (auto-search)
- **Assigned To**: User responsible for this deal
- **Tags**: Custom labels (e.g., "Hot Lead", "Government", "Referral")
- **Notes**: Internal comments and observations
- **ClickUp Link**: Project management task URL

#### 5.1.2 Opportunity Stages (Sales Pipeline)

```
SALES PIPELINE FLOW
═══════════════════════════════════════════════════════════════════

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ PROSPECT │───▶│QUALIFIED │───▶│ PROPOSAL │───▶│NEGOTIATION│
│  (Lead)  │    │(Validated)│   │ (Offer)  │    │ (Terms)  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
   │                │                │                │
   │                │                │                │
   ▼                ▼                ▼                ▼
14 days         21 days          18 days          28 days
                                                      │
                                                      ▼
                                              ┌──────────┐
                                              │TERM SHEET│
                                              │  (LOI)   │
                                              └──────────┘
                                                      │
                                                   35 days
                                                      │
                                                      ▼
                                              ┌──────────┐
                                              │   WON    │──▶ Auto-create
                                              │(Executed)│    PROJECT
                                              └──────────┘
   ╔══════════════════════════════════════════════════════════╗
   ║  At any stage, deal can move to LOST (capture reason)   ║
   ╚══════════════════════════════════════════════════════════╝
```

**Stage 1: Prospect**
- **Definition**: Initial lead identified, preliminary contact made
- **Activities**: Cold outreach, referral introduction, inbound inquiry
- **Quality Gates**:
  - ☐ Origination / Initial Contact
  - ☐ Decision Unit / Stakeholders Identified
  - ☐ Site Preliminary Yield Estimate

**Stage 2: Qualified**
- **Definition**: Lead meets ICP criteria, budget confirmed, decision-maker engaged
- **Activities**: Data room setup, initial site visit, utility bill collection
- **Quality Gates**:
  - ☐ Data Room: 12-month Bills & Load Profile
  - ☐ Pre-IC Filter (Go-No-Go Approval)
  - ☐ Commercial Workshop (1st Presentation)

**Stage 3: Proposal**
- **Definition**: Economic modeling complete, indicative offer prepared
- **Activities**: Financial model review, TDD initiation, offer submission
- **Quality Gates**:
  - ☐ Unit Economic Audit (Financial Model)
  - ☐ Technical Due Diligence (TDD) Sign-off
  - ☐ Indicative Offer Submitted

**Stage 4: Negotiation**
- **Definition**: Active negotiation on commercial terms and PPA structure
- **Activities**: Competitive positioning, term sheet drafting, credit evaluation
- **Quality Gates**:
  - ☐ Competitive Bidding / Positioning
  - ☐ Commercial Terms Agreed (Price/Tenure)
  - ☐ Counterparty Credit Approval

**Stage 5: Term Sheet**
- **Definition**: LOI or term sheet executed, final approvals in progress
- **Activities**: Legal DD, PPA redlining, final IC presentation
- **Quality Gates**:
  - ☐ Term Sheet / LOI Executed
  - ☐ Legal DD / PPA Redlining
  - ☐ Final Investment Committee (IC) Approval

**Stage 6: Won**
- **Definition**: PPA executed, security deposits received
- **Activities**: Project handoff to operations team
- **Quality Gates**:
  - ☑ PPA Execution (Signed)
  - ☑ Security Deposit / CP Satisfaction
- **Automatic Action**: System creates a linked Project record

**Stage 7: Lost**
- **Definition**: Deal terminated or withdrawn
- **Required**: Loss reason (credit failure, competitor rate, technical constraints, etc.)
- **Purpose**: Post-mortem analysis for pipeline improvement

#### 5.1.3 Quality Gates (Opportunity View)

**Access**: Click any opportunity → "Quality Gate" tab

**Purpose**: Investor-focused checklist ensuring institutional rigor at each stage.

**Visual Example**:
```
┌─────────────────────────────────────────────────────────────┐
│  QUALITY GATE: Qualified Stage                              │
│                                                              │
│  Progress: 2 of 3 completed (67%)                           │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 67%                              │
│                                                              │
│  ☑ Data Room: 12mo Bills & Load Profile                    │
│     └─ Completed by Sam Chen on Jan 2, 2026                │
│                                                              │
│  ☑ Pre-IC Filter (Go-No-Go Approval)                       │
│     └─ Completed by Sam Chen on Jan 3, 2026                │
│                                                              │
│  ☐ Commercial Workshop (1st Presentation)                  │
│     └─ Click to mark as complete                            │
│                                                              │
│  [ Advance to Proposal Stage ] (disabled until 100%)        │
└─────────────────────────────────────────────────────────────┘
```

**Usage**:
1. View checklist items for current stage
2. Check off completed items as you progress
3. Progress bar shows completion percentage
4. When all items checked, "Advance Stage" button activates
5. Click to move opportunity to next stage
6. System timestamps stage transitions for velocity analytics

#### 5.1.4 Opportunity Card Details

**Quick View Card** (List/Grid view):
- Company name and industry icon
- Current stage badge with color coding
- Value (formatted as ฿50M, ฿1.2B, etc.)
- Win probability and priority indicators
- Last activity timestamp
- Assigned user avatar

**Full Detail View** (Click card):
- **Overview Tab**: All fields, edit capability
- **Quality Gate Tab**: Stage-specific checklist
- **Activities Tab**: Linked calls, meetings, notes
- **Documents Tab**: Related media vault files
- **History Tab**: Audit trail of changes

#### 5.1.5 Filters and Search

**Filter Options**:
- Stage (multi-select)
- Priority (Low, Medium, High, Critical)
- RE Type (Solar PV, Wind, BESS, etc.)
- Industry (Thai taxonomy sectors)
- Assigned To (user dropdown)
- Date Range (created date, expected close date)
- Value Range (min/max THB)

**Search**:
- Real-time search across company names, tags, notes
- Results update as you type
- Highlights matching text

**Sort Options**:
- Value (high to low / low to high)
- Expected Close Date (soonest first)
- Last Modified (most recent first)
- Alphabetical (A-Z)

**Mobile-Specific UI Elements**:

**Stage Filter Pills** (Horizontal Scroll):
```
┌──────────────────────────────────────────────────────┐
│ ← [All] [Prospect] [Qualified] [Proposal] [Negotiat→│
└──────────────────────────────────────────────────────┘
```
- Horizontal scrollable stage filter at top of list
- Tap to filter by stage
- Active pill highlighted with brand color
- Count badge shows number of deals per stage
- Smooth scroll animation with momentum

**Search Bar with Filter Icon**:
- Fixed at top, always accessible while scrolling
- Magnifying glass icon on left
- Filter icon on right (opens full filter modal)
- Clear "×" button appears when typing
- Sticky positioning maintains visibility

**Card Layout**:
- Full-width cards with 16px side margins
- 12px spacing between cards
- Tap entire card to view detail
- Swipe left to reveal quick actions (Archive, Edit, Share)
- Pull-to-refresh gesture at top of list

**Owner Grouping** (Team View):
- Opportunities grouped by assigned user
- Collapsible sections per owner
- Count badge shows deals per person
- Avatar thumbnail for each owner

#### 5.1.6 Hierarchical Deal Visibility (Mine vs Team)

**Purpose**: Managers can view their team's pipeline while individual contributors focus on their own deals.

**Segmented Control** (Top of Opportunities Screen):
```
┌──────────────────────────────────┐
│   [  Mine  ] [  Team  ]          │
└──────────────────────────────────┘
```

**Mine View**:
- Shows only opportunities assigned to you
- Includes opportunities you created
- Excludes your team members' deals
- Default view for individual contributors
- Faster loading (smaller dataset)

**Team View**:
- Shows your opportunities PLUS subordinates' opportunities
- Automatically includes all direct reports (defined in org chart)
- Recursive hierarchy: If you manage A, and A manages B, you see A's and B's deals
- Only visible if you have subordinates in `user_hierarchy` table
- If no subordinates, Team view shows same as Mine view

**How Hierarchy is Determined**:
1. System queries `user_hierarchy` table for `parent_user_id = your_user_id`
2. Identifies all direct reports
3. Recursively finds reports' reports (cascading visibility)
4. Fetches opportunities where `assigned_to` matches any user in hierarchy
5. Results displayed grouped by owner (or ungrouped based on preference)

**Visibility Example**:
```
Organizational Structure:
┌────────────────┐
│  Alice (CFO)   │
└────────┬───────┘
         │
    ┌────┴─────┐
    │          │
┌───▼───┐  ┌───▼────┐
│ Bob   │  │ Carol  │
│(Mgr)  │  │ (Mgr)  │
└───┬───┘  └───┬────┘
    │          │
┌───▼───┐  ┌───▼────┐
│ David │  │ Emma   │
└───────┘  └────────┘

Alice's Team View Shows:
- Alice's own opportunities
- Bob's opportunities
- Carol's opportunities
- David's opportunities (Bob's report)
- Emma's opportunities (Carol's report)

Bob's Team View Shows:
- Bob's own opportunities
- David's opportunities

David's Team View Shows:
- David's own opportunities (no subordinates)
```

**Use Cases**:

**For Individual Contributors**:
- Stay in Mine view (reduces noise)
- Focus on your deals without distraction
- Export your own pipeline for reporting

**For Managers**:
- Switch to Team view for pipeline reviews
- Monitor team velocity and deal health
- Identify coaching opportunities (stalled deals)
- Reallocate deals when team member overloaded

**RLS Implementation**:
- Row-Level Security policy checks hierarchy
- Query: `SELECT * FROM opportunities WHERE assigned_to IN (SELECT get_subordinates(auth.uid()))`
- Function `get_subordinates()` returns array of user IDs in hierarchy
- Efficient with PostgreSQL recursive CTE

**Performance Optimization**:
- Hierarchy cached in session (refresh on org chart change)
- Mine view uses simpler query (no joins)
- Team view uses indexed foreign keys for fast lookups
- Pagination prevents large datasets from slowing UI

#### 5.1.7 Stage Transition History (Audit Trail)

**Purpose**: Track when opportunities moved between stages for velocity analytics and audit compliance.

**Automatic Logging**:
- Every time opportunity stage changes, system logs:
  - Previous stage
  - New stage
  - Timestamp (timezone-aware)
  - User who made change
  - Duration in previous stage (calculated)

**Database Table**: `opportunity_stage_history`
```
Columns:
- id (UUID)
- opportunity_id (FK to opportunities)
- from_stage (text)
- to_stage (text)
- changed_at (timestamptz)
- changed_by (FK to crm_users)
- days_in_stage (integer, calculated)
```

**Access**: Opportunity detail → "History" tab → "Stage History" section

**Visual Example**:
```
┌─────────────────────────────────────────────────────────────┐
│  STAGE TRANSITION HISTORY                                   │
│                                                              │
│  Prospect → Qualified                                       │
│  📅 Jan 1, 2026 → Jan 15, 2026 (14 days)                   │
│  👤 Changed by Sam Chen                                     │
│                                                              │
│  Qualified → Proposal                                       │
│  📅 Jan 15, 2026 → Feb 5, 2026 (21 days)                   │
│  👤 Changed by Sam Chen                                     │
│                                                              │
│  Proposal → Negotiation                                     │
│  📅 Feb 5, 2026 → Feb 23, 2026 (18 days)                   │
│  👤 Changed by Sarah Johnson (reassigned)                  │
│                                                              │
│  ⏱️ Total cycle time so far: 53 days                       │
│  📊 Average for Negotiation stage: 28 days                 │
│  ⚠️ This deal is ahead of average pace (+10 days faster)  │
└─────────────────────────────────────────────────────────────┘
```

**Insights Provided**:

1. **Time-in-Stage Analysis**:
   - Identify bottlenecks (deals stuck in one stage)
   - Compare to historical averages
   - Flag deals moving too fast (potential quality issues)

2. **User Performance**:
   - Who advances deals fastest?
   - Are certain users consistently slower in specific stages?
   - Training opportunities identification

3. **Velocity Forecasting**:
   - Historical data feeds Velocity Dashboard metrics
   - Predict close dates based on current stage + average remaining time
   - Example: Deal in Negotiation (28 days avg) + Term Sheet (35 days avg) = 63 days to close

4. **Audit Compliance**:
   - Prove adherence to quality gates
   - Show IC approval timeline for investor reporting
   - Regulatory audit trail (e.g., proving due diligence timelines)

**Trigger Implementation**:
- PostgreSQL trigger on `opportunities` table
- Fires on UPDATE when `stage` column changes
- Automatically calculates `days_in_stage` using `updated_at - (SELECT changed_at FROM stage_history WHERE opportunity_id = NEW.id ORDER BY changed_at DESC LIMIT 1)`
- No manual logging required (zero user friction)

**Stage History Export**:
- Export opportunity with full stage history
- CSV format includes all transitions
- Useful for post-mortem analysis (Why did this deal take 6 months?)

**Reverse Transitions Logged**:
- If opportunity moves backward (e.g., Negotiation → Qualified), still logged
- Indicates deal setback (credit issue discovered, decision-maker changed, etc.)
- Flags appear in reports: "🔄 Stage Reversal: Negotiation → Qualified on Feb 10"

**Integration with Quality Gates**:
- Stage history shows if Quality Gate was 100% complete before advancement
- Warning if stage advanced without completing checklist (admin override)
- Ensures institutional rigor accountability

---

### 5.2 Accounts

**Purpose**: Master database of companies (counterparties, prospects, existing clients).

#### 5.2.1 Creating an Account

**Quick Add**:
1. Click "+" → "Account"
2. Enter:
   - **Company Name** (required)
   - **Industry** (Thai taxonomy)
   - **Country** (default: Thailand)
3. Click "Create"

**Full Form**:
- Navigate to: Accounts → "New Account" button
- Available fields:

**Core Fields**:
- **Company Name**: Official registered name
- **Industry**: Sector classification (Thai taxonomy)
- **Type**: Prospect, Customer, Partner, Competitor
- **Country**: Primary operating location
- **Website**: Company URL
- **Phone**: Main office number
- **Strategic Importance**: Low, Medium, High, Critical

**Relationship Fields**:
- **Related Partners**: Link EPC contractors, O&M providers
- **Related Opportunities**: Auto-populated when opportunities reference this account
- **Related Contacts**: Key decision-makers at this company

**Internal Use**:
- **Notes**: Private internal observations
- **ClickUp Link**: Project management reference
- **Tags**: Custom labels

#### 5.2.2 Strategic Importance

**Purpose**: Prioritize engagement with high-value counterparties.

**Levels**:
- **Critical**: Strategic anchor clients, multi-site pipelines, >100MW potential
- **High**: Strong credit profile, significant deal size (>฿50M), key industry player
- **Medium**: Standard commercial opportunity, established company
- **Low**: Small deal size, exploratory, low conversion probability

**Usage**:
- Filters prioritize critical/high accounts
- Dashboard "Top Accounts" widget uses this ranking
- Automated alerts for critical account activity

#### 5.2.3 Thai Taxonomy Integration

The system includes Thailand's sector classification system aligned with SET industry groupings:

**Major Sectors**:
- Agro & Food Industry
- Consumer Products
- Financials
- Industrials
- Property & Construction
- Resources
- Services
- Technology
- Transportation & Logistics
- Energy & Utilities

**Why This Matters**:
- Industry-specific risk profiles
- Regulatory considerations (e.g., BOI-promoted industries)
- Credit evaluation nuances
- Sector-specific energy consumption patterns

#### 5.2.4 Account-to-Opportunity Linking

**Automatic Linking**:
- When creating an opportunity, type company name in "Company Name" field
- System searches existing accounts
- If match found, auto-links (eliminates duplicates)

**Manual Linking**:
1. Open opportunity detail
2. Click "Link Account" button
3. Search and select account
4. System creates bidirectional relationship

**Benefits**:
- Single source of truth for company data
- View all opportunities per account in one place
- Consolidated counterparty risk view

---

### 5.3 Contacts

**Purpose**: Directory of individual stakeholders, decision-makers, and influencers.

#### 5.3.1 Creating a Contact

**Quick Add**:
1. Click "+" → "Contact"
2. Enter:
   - **Full Name** (required)
   - **Email** (required)
   - **Role** (e.g., CFO, Plant Manager)
   - **Organization** (links to Account)
3. Click "Create"

**Full Form**:
- Navigate to: Contacts → "New Contact" button

**Available Fields**:
- **Full Name**: First and last name
- **Email**: Primary email address
- **Phone**: Mobile or office number
- **Role**: Job title or function
- **Organization**: Link to Account (auto-search)
- **Country**: Location
- **Tags**: Relationship indicators (see below)
- **Notes**: Personal observations, communication preferences

#### 5.3.2 Contact Tags (Stakeholder Classification)

**Purpose**: Identify role in decision-making process for deal strategy.

**Tag Types**:

1. **Decision Maker**: Final approval authority (C-suite, owner, board member)
2. **Influencer**: Shapes opinion but doesn't approve (technical manager, consultant)
3. **Regulator**: Ensures compliance, may block (legal, compliance officer)
4. **Economic Buyer**: Controls budget (CFO, procurement director)
5. **Technical Buyer**: Evaluates technical solution (engineering manager, facility head)
6. **Champion**: Internal advocate pushing for your solution
7. **Gatekeeper**: Controls access to decision-makers (EA, procurement coordinator)
8. **Blocker**: Opposes your solution (competitor ally, risk-averse executive)

**Usage in Deal Strategy**:
- Identify all stakeholders early (Prospect/Qualified stage)
- Map decision unit before Commercial Workshop
- Tailor messaging to each stakeholder type
- Engage Champions to navigate Blockers

**Example Scenario**:
```
Opportunity: Solar PV system for ABC Manufacturing

Stakeholders:
- Mr. Somchai (CFO) → Decision Maker + Economic Buyer
- Ms. Nida (Plant Manager) → Technical Buyer + Champion
- Mr. Prasert (Compliance) → Regulator
- Ms. Wanida (EA to CEO) → Gatekeeper
```

#### 5.3.3 Contact-to-Account Linking

**Why Link?**:
- See all contacts at a company in one view
- Track job changes (person moves, update org field)
- Organizational chart visualization

**How to Link**:
1. When creating contact, fill "Organization" field (auto-search)
2. OR: Open contact → Edit → Select organization
3. System creates relationship

**View All Contacts at Account**:
1. Open Account detail
2. Click "Contacts" tab
3. See list of all linked individuals

---

### 5.4 Partners

**Purpose**: Manage relationships with EPC contractors, O&M providers, technology suppliers, and other ecosystem players.

#### 5.4.1 Creating a Partner

**Quick Add**:
1. Click "+" → "Partner"
2. Enter:
   - **Company Name** (required)
   - **Partner Type** (EPC, O&M, Technology, Financial, Consultant)
   - **Region** (operating geography)
3. Click "Create"

**Full Form**:
- Navigate to: Partners → "New Partner" button

**Available Fields**:
- **Company Name**: Official name
- **Partner Type**: Classification (EPC, O&M, Technology, Financial, Consultant)
- **Region**: Primary operating region (Central, North, Northeast, South, etc.)
- **Country**: Base location
- **Capabilities**: Text description of technical expertise
- **Capacity**: Max project size they can handle (MW)
- **Website**: Company URL
- **Contact Person**: Primary contact at partner company
- **Email**: Contact email
- **Phone**: Contact phone
- **Notes**: Performance history, reliability, pricing notes

#### 5.4.2 Partner Types

```
PARTNER ECOSYSTEM
═════════════════════════════════════════════════════

                    ┌────────────┐
                    │ YOUR DEAL  │
                    │   (PPA)    │
                    └──────┬─────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌─────▼────┐     ┌─────▼────┐
    │   EPC   │      │   O&M    │     │TECHNOLOGY│
    │Contractor│      │ Provider │     │ Supplier │
    └────┬────┘      └─────┬────┘     └─────┬────┘
         │                 │                 │
         └────────┬────────┴────────┬────────┘
                  │                 │
         ┌────────▼─────┐    ┌──────▼───────┐
         │  CONSULTANT  │    │  FINANCIAL   │
         │(TDD, Legal)  │    │(Debt, Insur.)│
         └──────────────┘    └──────────────┘
```

**EPC (Engineering, Procurement, Construction)**:
- System integrators who design and build solar/wind projects
- Critical for project delivery
- Track record and quality affects project risk

**O&M (Operations & Maintenance)**:
- Service providers for ongoing system upkeep
- Important for performance guarantee enforcement
- May be same as EPC or separate

**Technology**:
- Equipment suppliers (inverters, modules, trackers, BESS)
- Manufacturer relationships for procurement leverage
- Warranty and support considerations

**Financial**:
- Debt providers, insurance brokers, financial consultants
- Support deal structuring and risk mitigation

**Consultant**:
- Technical advisors, legal counsel, TDD providers
- Independent verification for lender requirements

#### 5.4.3 Partner-to-Project Linking

**Purpose**: Track which partners deliver which projects.

**How to Link**:
1. Open Project detail
2. Find "Partners" section
3. Click "Add Partner" → Select from list
4. Specify relationship (EPC, O&M, etc.)
5. System records association

**Benefits**:
- Partner performance tracking across projects
- Identify preferred contractors based on track record
- Risk management (avoid over-concentration with one EPC)

#### 5.4.4 Partner Capacity Management

**Purpose**: Ensure partner can handle project scale.

**Field**: `capacity` (in MW)

**Example**:
- Partner: SolarTech EPC
- Capacity: 50 MW
- Interpretation: Can handle up to 50MW projects simultaneously

**Usage**:
- Filter partners by min capacity requirement
- Avoid assigning projects beyond partner capability
- Plan pipeline phasing based on partner availability

---

### 5.5 Projects

**Purpose**: Manage active projects post-PPA execution.

#### 5.5.1 Project Creation

**Automatic**:
- When Opportunity moves to "Won" stage, system auto-creates a Project
- Inherits data: company name, capacity, value, assigned user
- Initial status: "Development"

**Manual**:
1. Click "+" → "Project"
2. Enter:
   - **Project Name** (required)
   - **Capacity (MW)** (required)
   - **Status** (required)
   - **Linked Account** (optional)
   - **Linked Opportunity** (optional)
3. Click "Create"

#### 5.5.2 Project Status Lifecycle

```
PROJECT LIFECYCLE
══════════════════════════════════════════════════════

┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ DEVELOPMENT │─────▶│ CONSTRUCTION │─────▶│ OPERATIONAL │
│  (6-12 mo)  │      │   (4-8 mo)   │      │ (20-25 yrs) │
└─────────────┘      └──────────────┘      └─────────────┘
       │                    │                      │
       │                    │                      │
       └────────────────────┴──────────────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   ON-HOLD   │ (Temporary pause)
                     └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   CLOSED    │ (Archive)
                     └─────────────┘

KEY MILESTONES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Development:  Permits → Interconnection → Financial Close
Construction: Mobilization → Installation → Commissioning
Operational:  Energization → Performance → Revenue
```

**Development**:
- Post-PPA execution
- Activities: Permits, interconnection, EPC selection, financial close
- Duration: Typically 6-12 months

**Construction**:
- EPC mobilized, equipment ordered, site work underway
- Activities: Progress monitoring, quality inspections, milestone payments
- Duration: Typically 4-8 months

**Operational**:
- System commissioned, producing energy, invoicing counterparty
- Activities: Performance monitoring, O&M oversight, revenue tracking
- Duration: PPA term (typically 20-25 years)

**On-Hold**:
- Temporarily paused due to external factor (permit delay, force majeure, etc.)
- Requires explanation in notes

**Closed**:
- Project complete (end of PPA term, sold, terminated)
- Archive status

#### 5.5.3 Project Details

**Fields**:
- **Project Name**: Typically "[Company Name] - [Capacity]MW Solar PV"
- **Capacity (MW)**: Installed capacity
- **Status**: See lifecycle above
- **Commercial Operation Date (COD)**: Target energization date
- **Linked Opportunity**: Backreference to original deal
- **Linked Account**: Counterparty company
- **Assigned To**: User managing project delivery
- **Partners**: EPC, O&M, etc.
- **Notes**: Construction updates, issues, achievements
- **ClickUp Link**: Project management workspace

#### 5.5.4 Portfolio View

**Access**: Projects tab → Toggle "Portfolio View"

**Displays**:
- Total portfolio capacity (MW)
- Breakdown by status (Development, Construction, Operational)
- Map view showing project locations
- Capacity by region chart
- Timeline of expected COD milestones

---

### 5.6 Activities

**Purpose**: Log all interactions and maintain audit trail of engagement with counterparties.

#### 5.6.1 Activity Types

**Call**:
- Phone conversations with contacts
- Log: Date, time, duration, contact, summary, outcome

**Meeting**:
- In-person or video meetings
- Log: Date, time, location, attendees, agenda, decisions, next steps

**Site Visit**:
- Physical inspection of counterparty facility
- Log: Date, location, observations, photos (via Media Vault), yield estimate

**Email**:
- Significant email correspondence
- Log: Date, to/from, subject, summary

**Note**:
- General observations, research findings, internal comments
- Log: Date, content

**Task**:
- Action items requiring follow-up
- Log: Due date, assignee, description, completion status

#### 5.6.2 Creating an Activity

**Quick Add**:
1. Click "+" → "Activity"
2. Select type (Call, Meeting, Note, etc.)
3. Enter:
   - **Summary** (required): Brief description
   - **Type** (required): Selected in step 2
   - **Related To** (optional): Link to Opportunity, Account, Contact, etc.
   - **Notes** (optional): Detailed information
4. Click "Create"

**Full Form**:
- Navigate to: Activities → "New Activity" button
- Additional fields available:
  - **Date/Time**: When activity occurred (defaults to now)
  - **Duration**: For calls/meetings (minutes)
  - **Outcome**: Result of interaction
  - **Next Steps**: Action items identified
  - **Assigned To**: User responsible for follow-up

#### 5.6.3 Activity Timeline

**Access**: Activities tab OR any entity detail → "Activities" sub-tab

**Features**:
- Chronological list (newest first)
- Filter by type (Call, Meeting, Note, etc.)
- Filter by date range (Today, This Week, This Month, Custom)
- Search across summaries and notes
- Color-coded icons per activity type

**Timeline Filters**:
1. **Type Filter**: Show only specific activity types
2. **Date Range**: Custom start/end dates
3. **User Filter**: See only activities by specific team member
4. **Entity Filter**: Activities related to specific opportunity/account

#### 5.6.4 Activity Dashboard (Home Screen)

**Recent Activity Widget**:
- Shows 5 most recent activities across entire team
- Real-time updates (when Sam logs a call, it appears immediately)
- Click activity to view full detail
- Relative timestamps ("2 hours ago", "Just now")

---

## 6. Dashboard Views

### 6.1 Classic Dashboard (Home Screen)

**Purpose**: High-level overview of pipeline health and team activity.

#### 6.1.1 Key Metrics (Top Row)

```
CLASSIC DASHBOARD LAYOUT
════════════════════════════════════════════════════════════════════

┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Total Pipeline │  Active Deals  │Active Projects │ Total Capacity │
│    ฿850.5M     │       47       │       23       │    145.8 MW    │
│    ↑ 12.3%     │    ↑ 5 deals   │   ↑ 3 projects │   ↑ 15.2 MW    │
└────────────────┴────────────────┴────────────────┴────────────────┘

┌─────────────────────────────────┬─────────────────────────────────┐
│   Pipeline Distribution         │      Recent Activity            │
│                                  │                                 │
│   [Funnel Chart]                │   📞 Call with ABC Mfg          │
│   Prospect:      25 deals       │      2 hours ago                │
│   Qualified:     12 deals       │                                 │
│   Proposal:       8 deals       │   📧 Email to XYZ Corp          │
│   Negotiation:    5 deals       │      4 hours ago                │
│   Term Sheet:     3 deals       │                                 │
│                                  │   📅 Meeting scheduled          │
│                                  │      Just now                   │
└─────────────────────────────────┴─────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      Upcoming Actions                              │
│                                                                    │
│  ⚠ Follow up with DEF Ltd - Site visit        Due: Tomorrow      │
│  ⚠ Submit proposal to GHI Industries           Due: Jan 6        │
│  ⚠ IC presentation for JKL Company             Due: Jan 8        │
└───────────────────────────────────────────────────────────────────┘
```

**Total Pipeline Value**:
- Sum of all open opportunities (excludes Lost)
- Format: ฿XXM or ฿X.XB
- Click to filter opportunities

**Active Deals**:
- Count of opportunities not in Won or Lost stage
- Shows deals requiring attention
- Click to view filtered list

**Active Projects**:
- Count of projects in Development, Construction, or Operational
- Excludes On-Hold and Closed
- Click to navigate to projects view

**Total Capacity**:
- Sum of all project capacities (MW)
- Includes all project statuses
- Portfolio size indicator

#### 6.1.2 Pipeline Distribution Chart

**Visual**: Funnel or bar chart showing opportunities per stage

**Stages Displayed**:
1. Prospect (count)
2. Qualified (count)
3. Proposal (count)
4. Negotiation (count)
5. Term Sheet (count)

**Insights**:
- Identify bottlenecks (stages with excessive count)
- Monitor funnel shape (healthy: gradual decrease from top to bottom)
- Click stage to filter opportunities

#### 6.1.3 Recent Activity Feed

**Shows**: 5 most recent activities across entire team

**Information Displayed**:
- Activity type icon (phone, calendar, email, note)
- Activity type label (Call, Meeting, Email, Note)
- Summary text
- Relative time ("2 hours ago", "Just now")

**Real-Time Updates**:
- When any user logs an activity, it appears here immediately
- No page refresh required
- Ensures team visibility into latest engagements

#### 6.1.4 Upcoming Actions

**Shows**: Tasks and activities with due dates in next 7 days

**Columns**:
- Task description
- Related entity (Opportunity, Account, Contact)
- Assigned to (user)
- Due date
- Status (Pending, Overdue)

**Features**:
- Overdue items highlighted in red
- Click to mark complete
- Click entity to navigate to detail

---

### 6.2 Velocity Dashboard (Advanced Analytics)

**Purpose**: Real-time pipeline velocity metrics for sales performance management.

**Access**: Home → Toggle "Velocity View" (top-right switch)

#### 6.2.1 Velocity Metrics

**Average Days Per Stage**:
- Shows how long deals spend in each stage
- Calculated from historical stage transitions
- Helps identify slow stages requiring process improvement

**Example**:
```
Prospect → Qualified: 14 days
Qualified → Proposal: 21 days
Proposal → Negotiation: 18 days
Negotiation → Term Sheet: 28 days
Term Sheet → Won: 35 days

Total Cycle Time: 116 days
```

**Win Rate by Stage**:
- Percentage of deals that advance to next stage
- Identifies conversion drop-off points

**Example**:
```
Prospect → Qualified: 45% (high attrition expected)
Qualified → Proposal: 70%
Proposal → Negotiation: 65%
Negotiation → Term Sheet: 55%
Term Sheet → Won: 80% (high confidence at this stage)
```

**Period Comparison**:
- Each metric shows current period vs. previous period
- Delta displayed as % increase/decrease with up/down arrow
- Green (positive) or red (negative) color coding

#### 6.2.2 Velocity Charts

**Deal Flow Trend**:
- Line chart showing new opportunities created per week/month
- Helps predict future capacity needs

**Stage Progression Heatmap**:
- Visual showing which stages have highest activity
- Color intensity = number of deals progressing

**Time-to-Win Distribution**:
- Histogram of days from Prospect to Won for closed deals
- Identify fast-track vs. slow-burn deal patterns

#### 6.2.3 Using Velocity Data

**Forecast Accuracy**:
- Historical velocity + current pipeline = projected wins
- Example: 10 deals in Term Sheet × 80% win rate = 8 expected closes

**Process Improvement**:
- Long average days in Negotiation? → Review pricing strategy, credit process
- Low Qualified → Proposal conversion? → Improve lead qualification criteria

**Capacity Planning**:
- Predict when deals will close based on stage velocity
- Align EPC resources, financing, and equipment procurement

---

## 7. Advanced Features

### 7.1 Media Vault

**Purpose**: Secure document repository with GPS verification for site visit documentation.

**Access**: Any entity detail → "Documents" tab OR dedicated Media Vault section

#### 7.1.1 Supported File Types

- **Images**: JPG, PNG, HEIC (site photos, equipment photos)
- **Documents**: PDF, DOCX, XLSX (contracts, financial models, reports)
- **Videos**: MP4, MOV (drone footage, walkthroughs)
- **CAD Files**: DWG, DXF (engineering drawings)
- **GIS Data**: KML, SHP (site location files)

#### 7.1.2 File Categories

When uploading, select category:

1. **Roof**: Rooftop photos, structural assessments
2. **Electrical**: Single-line diagrams, panel schedules, as-builts
3. **Utility Bill**: 12-24 months of electricity bills (TDD requirement)
4. **Load Profile**: 15-min or hourly demand data from meter
5. **Site Plan**: Layouts, satellite imagery, setback diagrams
6. **Legal**: Land title deeds, lease agreements, permits
7. **Financial**: Financial statements, credit reports, bank references
8. **Technical Report**: Yield studies, shading analysis, TDD reports
9. **Contract**: PPA draft, term sheet, EPC agreement
10. **Other**: Miscellaneous files

#### 7.1.3 Uploading Files

**Process**:
1. Navigate to entity (Opportunity, Account, etc.)
2. Click "Documents" tab
3. Click "Upload File" button
4. Select file from device
5. Choose category (required)
6. Add description (optional)
7. **GPS Verification** (if on mobile with location enabled):
   - System captures GPS coordinates
   - Embeds in file metadata
   - Useful for proving site visit authenticity
8. Click "Upload"
9. File stored with signed URL for secure access

**Bulk Upload**:
- Select multiple files (Ctrl+Click or Cmd+Click)
- All files assigned same category
- Batch upload confirmation

#### 7.1.4 Viewing Files

**File Card**:
- Thumbnail preview (for images)
- File name
- Category badge
- Upload date and user
- File size
- GPS coordinates (if available)

**Actions**:
- **Preview**: In-browser view (images, PDFs)
- **Download**: Save to device
- **Delete**: Remove from vault (admin only)
- **Share Link**: Generate temporary signed URL (valid 1 hour)

#### 7.1.5 GPS Verification

**Why It Matters**:
- Proves site visit authenticity for TDD providers and lenders
- Prevents fraud (using stock photos, photos from different site)
- Timestamps location and date

**How It Works**:
1. User visits site with mobile device
2. Opens CRM, navigates to opportunity
3. Clicks "Documents" → "Upload"
4. Selects photos from camera roll (or takes new photo in-app)
5. System requests location permission
6. If granted, GPS coordinates embedded in upload metadata
7. File stored with location stamp visible in detail view

**Privacy Note**:
- GPS only captured for files uploaded from mobile with permission granted
- Desktop uploads do not include GPS
- Users can disable location services if preferred (GPS simply not recorded)

---

### 7.2 Network Graph

**Purpose**: Visualize professional relationships and identify hidden connections.

**Access**: Accounts tab → Click account → "Network" tab

#### 7.2.1 Graph Elements

**Nodes**:
- **People** (Contacts): Circular nodes, color-coded by role
- **Companies** (Accounts): Square nodes, color-coded by industry
- **Center Node**: Selected entity (highlighted larger)

**Edges (Lines)**:
- **Thickness**: Relationship strength (frequent contact = thicker)
- **Color**: Relationship type (business, personal, former colleague, etc.)
- **Directional Arrow**: Hierarchical (reports to, manages, etc.)

#### 7.2.2 Relationship Types

When creating relationships, specify type:

1. **Works At**: Contact employed by Account
2. **Manages**: Supervisory relationship
3. **Reports To**: Reverse hierarchical
4. **Former Colleague**: Previously worked together
5. **Referral**: Introduced you to another contact
6. **Business Partner**: Separate companies with partnership
7. **Customer/Vendor**: Commercial relationship
8. **Advisor**: Consultant or board member relationship

#### 7.2.3 Degrees of Separation

**1st Degree**: Direct connections (your contacts)
**2nd Degree**: Contacts of your contacts (potential warm introductions)
**3rd Degree**: Extended network (requires chain introduction)

**Filter**:
- Toggle "Show 2nd Degree" to expand graph
- Toggle "Show 3rd Degree" for full network visibility

#### 7.2.4 Use Cases

**Warm Introduction**:
- Scenario: You want to reach Mr. A at Company X
- Graph shows: Your contact Ms. B worked with Mr. A (former colleague)
- Action: Ask Ms. B for introduction

**Decision Unit Mapping**:
- Visualize all stakeholders at target account
- Identify reporting structure (who influences decision maker?)
- Plan engagement strategy based on hierarchy

**Conflict Check**:
- Before engaging new lead, check if existing relationships create conflict
- Example: Your contact is advisor to competitor → potential issue

---

### 7.3 Quality Gates (Investor-Focused Workflow)

**Purpose**: Enforce institutional rigor aligned with investment committee approval stages.

**Access**: Opportunity detail → "Quality Gate" tab

#### 7.3.1 Stage-Specific Checklists

Each stage has 2-3 critical milestones that must be completed before advancing. See Section 5.1.2 for full list.

#### 7.3.2 Completion Tracking

**Progress Bar**:
- Shows X of Y items completed
- Visual percentage bar (0-100%)

**Checklist Items**:
- Unchecked: Gray circle icon, gray text
- Checked: Green checkmark icon, green text
- Click to toggle completion status

**Timestamp Recording**:
- System records date/time when item checked
- User who checked item also logged
- Visible in history/audit trail

#### 7.3.3 Stage Advancement

**Requirements**:
- All checklist items for current stage must be completed
- "Advance Stage" button enabled only when 100% complete

**Process**:
1. Complete all quality gate items
2. "Advance Stage" button turns from gray to active (orange)
3. Click "Advance Stage"
4. Confirmation modal: "Move to [Next Stage]?"
5. Confirm → Opportunity stage updated
6. New quality gate checklist loaded for next stage

**Benefits**:
- Prevents premature stage progression (e.g., moving to Negotiation before TDD complete)
- Ensures IC readiness (all required docs/approvals in place before final presentation)
- Velocity analytics accuracy (stage transitions tied to real milestones)

#### 7.3.4 Lost Reason Capture

**Trigger**: If opportunity moved to "Lost" stage

**Requirements**:
- "Loss Reason" text field required (cannot save without entry)
- Field accepts multi-line text

**Recommended Loss Reasons**:
- Credit failure / Counterparty credit rating too low
- Competitive pricing (competitor offered lower PPA rate)
- Technical constraints (roof condition, shading, interconnection issues)
- Counterparty withdrew / Project cancelled
- Internal decision (not aligned with investment thesis)
- Permitting or regulatory barriers
- Timing mismatch (counterparty needs system sooner than we can deliver)

**Usage**:
- Admin/management reviews loss reasons quarterly
- Identifies patterns (e.g., consistently losing on price → pricing strategy issue)
- Informs pipeline improvement initiatives

---

### 7.4 Bulk Import Wizard

**Purpose**: Rapidly onboard data from spreadsheets (Excel, CSV, Google Sheets).

**Access**: Any entity list view → "Import" button

#### 7.4.1 Supported Entities

- Contacts
- Accounts
- Opportunities
- Projects
- Partners

#### 7.4.2 Import Process

```
BULK IMPORT WIZARD FLOW
════════════════════════════════════════════════════════════════════

Step 1: Select Entity Type
┌─────────────────────────────────────────┐
│ What are you importing?                 │
│  ○ Contacts                             │
│  ○ Accounts                             │
│  ● Opportunities                        │
│  ○ Projects                             │
│  ○ Partners                             │
│                           [Next Step →] │
└─────────────────────────────────────────┘
                   ↓
Step 2: Download Template
┌─────────────────────────────────────────┐
│ 📥 Download our Excel template          │
│ [Download Template.xlsx]                │
│                           [Next Step →] │
└─────────────────────────────────────────┘
                   ↓
Step 3: Upload Your File
┌─────────────────────────────────────────┐
│ 📤 Upload completed template            │
│ [Choose File: opportunities.xlsx]       │
│ ✓ 47 rows detected                      │
│                           [Next Step →] │
└─────────────────────────────────────────┘
                   ↓
Step 4: Column Mapping & Linking
┌─────────────────────────────────────────┐
│ Your Column    →    CRM Field           │
│ "Company"      →    Company Name   ✓    │
│ "Deal Size"    →    Value          ✓    │
│ "Stage"        →    Stage          ✓    │
│                                          │
│ Smart Linking: 12 accounts matched      │
│                           [Next Step →] │
└─────────────────────────────────────────┘
                   ↓
Step 5: Validation
┌─────────────────────────────────────────┐
│ ✓ 44 rows valid                         │
│ ⚠ 3 rows have errors                    │
│   Row 5: Invalid email format           │
│   Row 12: Stage not recognized          │
│   Row 23: Value must be number          │
│                           [Import Now] │
└─────────────────────────────────────────┘
                   ↓
Step 6: Import Complete
┌─────────────────────────────────────────┐
│ ✓ Success! 44 opportunities imported    │
│ 3 rows skipped (validation errors)      │
│ [Download Error Report] [Done]          │
└─────────────────────────────────────────┘
```

**Step 1: Select Entity Type**
- Choose which entity type you're importing (e.g., Contacts)

**Step 2: Download Template**
- Click "Download Template" to get Excel file with correct column headers
- Template includes:
  - Required fields (marked with *)
  - Optional fields
  - Sample data rows
  - Data validation (dropdowns for enums)

**Step 3: Prepare Data**
- Fill out template with your data
- Ensure required fields populated
- Use provided dropdowns for enum fields (stage, priority, etc.)
- Save as .xlsx or .csv

**Step 4: Upload File**
- Click "Choose File" and select your prepared file
- System parses file and validates data

**Step 5: Column Mapping**
- System attempts auto-mapping (matches column names)
- Review mappings, adjust if needed
- Example:
  ```
  File Column: "Company"  →  CRM Field: "Company Name" ✓
  File Column: "Phone #"  →  CRM Field: "Phone" ✓
  File Column: "Revenue"  →  CRM Field: [Unmapped] ⚠
  ```
- Unmapped columns skipped (data not imported)

**Step 6: Smart Linking**
- For fields that reference other entities (e.g., "Linked Account" in Opportunities), wizard attempts to find matches
- Fuzzy matching algorithm with similarity score:
  - 100% = Exact match (auto-links)
  - 75-99% = High confidence (suggested, user confirms)
  - 50-74% = Possible match (user reviews)
  - <50% = No match (left unlinked)
- Example:
  ```
  Opportunity Row: "Company Name" = "ABC Manufacturing Co., Ltd."
  Existing Account: "ABC Manufacturing"
  Similarity: 87% → Suggested link → User confirms → Linked
  ```

**Step 7: Validation**
- System validates all data:
  - Required fields present?
  - Email formats valid?
  - Phone numbers formatted correctly?
  - Enum values match allowed options?
  - Number fields contain numbers?
  - Date fields parseable?
- Errors displayed in table:
  ```
  Row 5: Email invalid (missing @)
  Row 12: Stage "Negotiating" not recognized (should be "Negotiation")
  Row 23: Value must be a number
  ```
- User can:
  - Fix in spreadsheet and re-upload
  - Edit directly in validation table
  - Skip invalid rows and import valid ones

**Step 8: Preview & Confirm**
- Shows summary:
  ```
  Ready to import:
  - 47 valid rows
  - 3 rows skipped (validation errors)
  - 12 rows auto-linked to existing accounts
  - 5 rows with suggested links (review required)

  Total records to create: 47 Opportunities
  ```
- Click "Import" to proceed

**Step 9: Import Execution**
- Progress bar shows import status
- Real-time feedback (e.g., "Imported 20 of 47...")
- On completion:
  - Success count
  - Failed count (if any)
  - Download error report (if failures occurred)

#### 7.4.3 Best Practices

1. **Start Small**: Test with 5-10 rows first, validate, then import full dataset
2. **Use Template**: Ensures column names match system expectations
3. **Clean Data First**: Remove duplicates, fix formatting issues before import
4. **Review Suggested Links**: Don't blindly accept fuzzy matches (confirm they're correct)
5. **Export Before Import**: Backup existing data by exporting before large import (in case of need to revert)

#### 7.4.4 Common Issues

**Issue**: "Required field missing" error on all rows
- **Cause**: Column name misspelled or doesn't match template
- **Solution**: Use exact column names from template (case-sensitive)

**Issue**: Duplicate records created
- **Cause**: Fuzzy matching didn't find existing records
- **Solution**: Ensure company names in file match existing records exactly (or very closely)

**Issue**: Enum field errors (e.g., Stage not recognized)
- **Cause**: Value in file doesn't match allowed options
- **Solution**: Use dropdown values from template (exact spelling, capitalization)

---

### 7.5 Thai Taxonomy Integration

**Purpose**: Align with Thailand's sector classification for industry-specific insights.

#### 7.5.1 What Is Thai Taxonomy?

Thailand's official sector classification system, used by SET (Stock Exchange of Thailand) and aligned with GICS (Global Industry Classification Standard). Provides standardized categorization of companies by business activity.

#### 7.5.2 Sectors in CRM

When creating Accounts or Opportunities, "Industry" field uses Thai taxonomy:

**Agro & Food Industry**:
- Agriculture, food processing, beverages, livestock

**Consumer Products**:
- Fashion, personal care, home appliances

**Financials**:
- Banking, insurance, securities, asset management

**Industrials**:
- Manufacturing, chemicals, automotive, packaging

**Property & Construction**:
- Real estate development, construction, building materials

**Resources**:
- Mining, energy (upstream O&G), commodities

**Services**:
- Retail, healthcare, education, tourism

**Technology**:
- Software, IT services, telecom

**Transportation & Logistics**:
- Shipping, aviation, warehousing, logistics providers

**Energy & Utilities**:
- Power generation, renewables, utilities

#### 7.5.3 Why It Matters for Solar CRM

**Energy Consumption Patterns**:
- Industrials: High baseload, good fit for solar
- Hospitality (Services): Peak midday, aligns with solar generation
- Data Centers (Technology): 24/7 demand, may require hybrid + storage

**Credit Risk**:
- Sectors have different risk profiles (e.g., Industrials more stable than Tourism post-COVID)
- Affects PPA pricing and tenor

**Regulatory**:
- BOI-promoted sectors (manufacturing for export) may have incentives affecting solar economics
- Energy-intensive sectors (e.g., cement, steel) may have mandated renewable quotas

**Targeting**:
- Filter opportunities by sector to focus on high-priority verticals
- Example: If your investment thesis targets manufacturing, filter for "Industrials"

---

## 8. Administrative Functions

### 8.1 Admin Panel

**Access**: User menu (top-right) → "Admin Panel" (only visible to Admin/Super Admin)

#### 8.1.1 Overview Dashboard

**Key Stats**:
- Total users (breakdown by role)
- Total entities (opportunities, accounts, contacts, partners, projects)
- Storage used (file vault)
- Active sessions (logged-in users)

**Charts**:
- User registrations over time
- Entity creation trend
- Login activity heatmap

#### 8.1.2 User Management

**Access**: Admin Panel → "User Management" tab

**User List Columns**:
- Avatar and name
- Email
- Role (Super Admin, Admin, Internal, External)
- Status (Active, Inactive, Suspended)
- Last login date
- 2FA enabled (Yes/No)
- Password change required (Yes/No)

**Actions**:
- **Create New User**: Opens user creation dialog
- **Edit User**: Modify user details, change role, reset password
- **Suspend User**: Disable login without deleting account
- **Delete User**: Permanently remove (cascades to owned entities)

#### 8.1.3 Creating a New User

**Process**:
1. Click "Create New User" button
2. Enter required fields:
   - **Full Name**
   - **Email** (must be unique)
   - **Role** (Internal, External, Admin, Super Admin)
   - **Temporary Password** (user will be forced to change on first login)
   - **Position/Title** (optional)
   - **Department** (optional)
3. Click "Create User"
4. System sends welcome email with login instructions
5. User added to org chart automatically (if Internal/Admin)

**Edge Function Used**: `create-user` (Supabase Edge Function)

**Important**:
- New users have `password_change_required` flag set to TRUE
- Cannot proceed past login screen until new password set
- Meets security best practices

#### 8.1.4 Editing a User

**Access**: User Management → Click user row → "Edit" button

**Editable Fields**:
- Full name
- Email (requires re-verification)
- Role (except: cannot demote Super Admin, cannot self-edit role)
- Status (Active, Inactive, Suspended)
- 2FA enabled (can disable if user locked out)
- Password change required (can force password reset)

**Actions**:
- **Reset Password**: Generates new temporary password, sends email, sets `password_change_required` to TRUE
- **Disable 2FA**: Emergency access if user lost authenticator device
- **Suspend Account**: Blocks login but preserves data
- **Delete User**: Permanent removal (confirmation modal warns of cascade effects)

**Edge Function Used**:
- `reset-user-password` for password resets
- Direct Supabase admin updates for role/status changes

#### 8.1.5 Organizational Chart

**Access**: Admin Panel → "Org Chart" tab

**Visual**: Hierarchical tree diagram showing team structure

**Example Organizational Chart**:
```
                    ┌────────────────────┐
                    │   John Smith       │
                    │   CEO              │
                    │   (Super Admin)    │
                    └─────────┬──────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼─────────┐         ┌──────────▼─────────┐
    │   Sarah Johnson   │         │   Mike Williams    │
    │   CFO             │         │   COO              │
    │   (Admin)         │         │   (Admin)          │
    └─────────┬─────────┘         └──────────┬─────────┘
              │                               │
      ┌───────┴───────┐           ┌──────────┴─────────┐
      │               │           │                    │
┌─────▼────┐    ┌─────▼────┐ ┌────▼────┐      ┌───────▼──────┐
│Accounting│    │ Finance  │ │Operations│      │Project Mgmt  │
│Manager   │    │ Analyst  │ │ Manager  │      │(Sam Chen)    │
│(Internal)│    │(Internal)│ │(Internal)│      │(Internal)    │
└──────────┘    └──────────┘ └──────────┘      └──────────────┘
```

**Elements**:
- **Boxes (Nodes)**: Each user represented by box with:
  - Avatar
  - Name
  - Title/Role
  - Department
- **Lines (Edges)**: Reporting relationships (direct reports)

**Hierarchy Definition**:
- Defined via `user_hierarchy` table (see database schema)
- Relationships:
  - Parent: Manager
  - Children: Direct reports

**Editing Hierarchy**:
1. Click user node
2. "Edit Reporting" dialog opens
3. Select manager from dropdown
4. Save → Line redrawn to new manager

**Use Cases**:
- Onboard new team members (visualize org structure)
- Visibility and permissions planning
- Identify reporting gaps

---

### 8.2 Activity Logs

**Purpose**: Audit trail of all significant system actions.

**Access**: Admin Panel → "Activity Logs" tab

#### 8.2.1 Logged Actions

**User Actions**:
- Login (success, failed attempts)
- Logout
- Password changes
- 2FA setup/disable
- Profile updates

**Data Actions**:
- Entity creation (opportunity, account, contact, etc.)
- Entity updates (tracks field changes)
- Entity deletion
- File uploads/downloads
- Import operations

**Admin Actions**:
- User creation
- User deletion
- Role changes
- Password resets
- Settings modifications

#### 8.2.2 Log Entry Details

**Columns**:
- **Timestamp**: Date and time (timezone-aware)
- **User**: Who performed action (name + email)
- **Action Type**: Login, Create, Update, Delete, etc.
- **Entity Type**: Opportunity, Account, User, etc.
- **Entity ID**: Unique identifier
- **Details**: JSON payload with before/after values (for updates)
- **IP Address**: Source IP (for security auditing)

**Example Entry**:
```
Timestamp: 2026-01-04 14:23:15 +07:00
User: Sam Chen (sam@company.com)
Action: Update
Entity Type: Opportunity
Entity ID: abc123
Details: {"field": "stage", "old_value": "Proposal", "new_value": "Negotiation"}
IP: 203.154.12.45
```

#### 8.2.3 Filtering and Search

**Filters**:
- **Date Range**: Last 24 hours, Last 7 days, Last 30 days, Custom
- **Action Type**: Login, Create, Update, Delete, etc.
- **User**: Dropdown of all users
- **Entity Type**: Opportunity, Account, User, etc.

**Search**:
- Free text search across entity IDs, details, IP addresses

**Export**:
- Download filtered logs as CSV for external analysis
- Useful for compliance reporting

---

### 8.3 Settings Panel

**Access**: Admin Panel → "Settings" tab

#### 8.3.1 General Settings

**Company Information**:
- Company Name
- Logo (uploaded to storage)
- Primary Color (hex code for branding)
- Time Zone (default for all users)

**Session Management**:
- Default session timeout (minutes)
- Remember Me duration (days)
- Concurrent session limit (max devices per user)

**Notifications**:
- Enable/disable email notifications
- Enable/disable in-app notifications
- Notification frequency (real-time, digest)

#### 8.3.2 Security Settings

**Password Policy**:
- Minimum length (default: 8)
- Require uppercase (default: Yes)
- Require numbers (default: Yes)
- Require special characters (default: Yes)
- Password expiration (days, default: 90)
- Prevent password reuse (last N passwords, default: 3)

**Two-Factor Authentication**:
- Enforce 2FA for all Admins (toggle)
- Enforce 2FA for all Internal users (toggle)
- Allowed 2FA methods (Email OTP, Authenticator, both)

**Login Security**:
- Max failed login attempts before lockout (default: 5)
- Lockout duration (minutes, default: 30)
- IP whitelist (optional, for extra security)

#### 8.3.3 Integration Settings

**ClickUp Integration**:
- API key (encrypted at rest)
- Default workspace ID
- Sync frequency (manual, daily, real-time)

**Email Provider** (for notifications):
- SMTP host
- SMTP port
- Username
- Password (encrypted)
- From address
- From name

**Future Integrations** (placeholders):
- Salesforce sync
- Slack notifications
- QuickBooks export

---

## 9. Data Management

### 9.1 Data Export

**Purpose**: Extract data for analysis, reporting, or backup.

**Access**: Any entity list view → "Export" button

#### 9.1.1 Export Formats

**CSV**:
- Comma-separated values
- Openable in Excel, Google Sheets, any text editor
- Best for: Data analysis, pivot tables, importing to other systems

**Excel (.xlsx)**:
- Microsoft Excel format with formatting
- Best for: Reporting, sharing with stakeholders who use Excel

**JSON**:
- Machine-readable structured format
- Best for: API integrations, technical analysis, backup/restore

#### 9.1.2 Export Process

1. Navigate to entity list (e.g., Opportunities)
2. Apply filters if needed (e.g., only Won opportunities)
3. Click "Export" button
4. Select format (CSV, Excel, JSON)
5. Choose fields to include (All, Essential, Custom selection)
6. Click "Download"
7. File generated and downloaded to device

**Filename Format**: `[Entity]_[Date]_[Time].csv`
- Example: `Opportunities_2026-01-04_14-30.csv`

#### 9.1.3 Field Selection

**All Fields**: Every column in database (including internal IDs)

**Essential Fields**: Curated list of user-facing fields (excludes metadata)

**Custom Selection**: Check boxes for specific fields you need
- Example: For pipeline report, select only: Company Name, Stage, Value, Expected Close Date

---

### 9.2 Data Import (See Bulk Import Wizard - Section 7.4)

---

### 9.3 Data Backup and Restore

**Automatic Backups**:
- Supabase performs daily automated backups
- Retention: 30 days (upgrade plan for longer retention)
- Stored in geographically distributed locations

**On-Demand Backup**:
1. Admin Panel → Settings → Backup & Restore
2. Click "Create Backup Now"
3. System generates full database snapshot
4. Backup stored in secure cloud storage
5. Download link provided (expires 7 days)

**Restore Process**:
1. Admin Panel → Settings → Backup & Restore
2. Click "Restore from Backup"
3. Select backup date from list
4. Confirmation modal: "This will overwrite current data. Proceed?"
5. Confirm → Restoration begins
6. System restarts (users logged out)
7. Restoration complete → Users can log back in

**Important**:
- Only Super Admin can perform restore
- Requires explicit confirmation (to prevent accidental data loss)
- All users logged out during restore for data consistency

---

### 9.4 Data Deletion and Retention

**Entity Deletion**:
- Soft delete by default (record marked as deleted, not removed from database)
- Allows recovery if deletion was accidental
- Permanently purged after 30 days

**User Deletion**:
- When user deleted, owned entities transferred to their manager (if defined) or Super Admin
- Prevents orphaned records
- User account permanently deleted immediately (cannot restore)

**Activity Logs**:
- Retained for 1 year by default
- Configurable in Settings (compliance requirements may dictate longer retention)

**File Storage**:
- Deleted files moved to "Trash" (visible only to admins)
- Permanently purged after 30 days
- Admin can restore from Trash or permanently delete immediately

---

## 10. Best Practices

### 10.1 Data Entry Standards

**Consistency is Key**:
- Use full legal names for companies (e.g., "ABC Manufacturing Co., Ltd." not "ABC Mfg")
- Format phone numbers consistently (+66 2 123 4567 not 02-123-4567)
- Use proper capitalization (avoid ALL CAPS)

**Completeness**:
- Fill all required fields (system enforces this)
- Also fill optional fields when information available (improves reporting accuracy)
- Example: Even if "Expected Close Date" is optional, providing it enables velocity forecasting

**Avoid Duplicates**:
- Before creating new Account, search to check if it already exists
- Use bulk import linking feature to connect records (don't create duplicate accounts)

**Tagging**:
- Use tags for ad-hoc categorization (e.g., "Hot Lead", "Government", "Referral from Partner X")
- Keep tag list manageable (don't create 100 unique tags)
- Standardize common tags (e.g., everyone uses "Hot Lead" not variations like "Hot", "Urgent Lead", etc.)

---

### 10.2 Workflow Recommendations

**Daily Routine**:
1. **Morning**: Check "Upcoming Actions" widget for today's tasks
2. **After each call/meeting**: Log activity immediately (while details fresh)
3. **End of day**: Update opportunity stages if milestones reached

**Weekly Routine**:
1. **Pipeline Review**: Review all opportunities, update stages, add notes on progress
2. **Task Cleanup**: Mark completed tasks as done, reschedule delayed tasks
3. **Team Sync**: Review Recent Activity feed to see team's weekly progress

**Monthly Routine**:
1. **Data Quality Audit**: Check for duplicate accounts, incomplete records
2. **Velocity Review**: Analyze Velocity Dashboard, identify bottlenecks
3. **Lost Opportunity Analysis**: Review "Lost" deals, identify patterns
4. **Trusted Devices Review**: Remove old/unused devices from trusted list

---

### 10.3 Collaboration

**Assigning Ownership**:
- Assign every opportunity to a specific user (accountable for progress)
- For team deals, use "Related Users" field to credit multiple people

**Internal Notes**:
- Use "Notes" field for internal observations (not visible to external users)
- Document context that might not be obvious from structured fields
- Example: "CFO skeptical about payback period, focus on LCOE vs grid rate comparison"

**Activity Tagging**:
- When logging activity, link it to related opportunity/account/contact
- Enables complete timeline view per entity

---

### 10.4 Security Hygiene

**For All Users**:
1. Enable 2FA on your account
2. Use strong, unique password (password manager recommended)
3. Logout when using shared computers
4. Review trusted devices monthly, remove old ones
5. Report suspicious activity to admin immediately

**For Admins**:
1. Enforce 2FA for all admin accounts (non-negotiable)
2. Review activity logs weekly for anomalies
3. Use strong password policy (enforce in settings)
4. Limit Super Admin role to ONE person (current best practice)
5. Perform quarterly access reviews (remove inactive users)

---

## 11. Troubleshooting

### 11.1 Login Issues

**Problem**: "Invalid email or password" error

**Solutions**:
1. Double-check email spelling (case-sensitive)
2. Check Caps Lock is off for password
3. If you've forgotten password, click "Forgot Password?" link
4. If account locked (too many failed attempts), wait 30 minutes or contact admin for unlock

---

**Problem**: 2FA code not accepted

**Solutions**:
1. Ensure you're entering code from correct authenticator app (if you have multiple apps)
2. Check device time is correct (TOTP codes time-sensitive)
3. If using email OTP, check spam folder
4. Request new code (old code expires after 5 minutes)
5. If authenticator lost, contact admin to disable 2FA temporarily

---

**Problem**: "Session expired" message

**Solutions**:
1. Log in again (normal behavior after inactivity timeout)
2. If you want longer sessions, use "Remember Me" on login
3. If session timeout is too short for your workflow, ask admin to adjust in Settings

---

### 11.2 Performance Issues

**Problem**: Page loading slowly

**Solutions**:
1. Check internet connection
2. Clear browser cache (Ctrl+Shift+Del on Windows, Cmd+Shift+Del on Mac)
3. Try different browser (Chrome recommended)
4. Disable browser extensions (some conflict with CRM)
5. If persistent, report to admin (may be server-side issue)

---

**Problem**: File upload fails or takes very long

**Solutions**:
1. Check file size (max 100MB per file)
2. Check internet upload speed (large files require good connection)
3. Try smaller file or compress images
4. If persistent, contact admin (storage quota may be full)

---

### 11.3 Data Issues

**Problem**: Can't find record I know exists

**Solutions**:
1. Check filters (you may have filter active that hides it)
2. Use search function (search across multiple fields)
3. Check if record owned by another user (RLS may hide it)
4. Ask admin to search globally (they have broader access)

---

**Problem**: Duplicate records created

**Solutions**:
1. Contact admin to merge duplicates (admin function)
2. Going forward, search before creating new records
3. Use bulk import linking feature to prevent duplicates

---

**Problem**: Import failed with validation errors

**Solutions**:
1. Download error report (shows specific rows with issues)
2. Fix issues in spreadsheet (check format, required fields, enum values)
3. Re-upload corrected file
4. If unsure about error, download template again and compare column names

---

### 11.4 Permission Issues

**Problem**: "You don't have permission" error

**Solutions**:
1. Confirm your user role (Profile → View Role)
2. If External user, you can only view entities explicitly shared with you
3. If Internal user, you may be trying to edit another user's entity (ownership check)
4. Contact admin to adjust permissions or transfer entity ownership

---

**Problem**: Can't access Admin Panel

**Solutions**:
1. Admin Panel only visible to Admin and Super Admin roles
2. If you should have admin access, contact Super Admin to change your role
3. If you're Internal user, this is expected (not an error)

---

## 12. Technical Architecture

### 12.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     User Devices                         │
│  (Desktop, Tablet, Mobile - Chrome, Safari, Firefox)    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React SPA)                    │
│  - React 18 + TypeScript                                │
│  - Tailwind CSS + shadcn/ui                             │
│  - TanStack Query (data fetching)                       │
│  - React Context (state management)                     │
└────────────────────┬────────────────────────────────────┘
                     │ REST API / Realtime subscriptions
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database                       │  │
│  │  - Row Level Security (RLS)                      │  │
│  │  - Triggers and functions                        │  │
│  │  - Full-text search                              │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Supabase Auth                             │  │
│  │  - Email/password authentication                 │  │
│  │  - Session management                            │  │
│  │  - 2FA support (TOTP)                            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Supabase Storage                          │  │
│  │  - File uploads (Media Vault)                    │  │
│  │  - Signed URLs (time-limited access)             │  │
│  │  - Bucket policies (RLS-like for files)          │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Edge Functions (Deno runtime)            │  │
│  │  - create-user                                    │  │
│  │  - delete-user                                    │  │
│  │  - reset-user-password                           │  │
│  │  - two-factor-auth                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

### 12.2 Database Schema Overview

**Core Tables**:
- `crm_users`: User accounts, profiles, roles, 2FA settings
- `accounts`: Companies (counterparties, prospects, clients)
- `contacts`: Individual people
- `opportunities`: Deal pipeline
- `projects`: Active projects (post-PPA execution)
- `partners`: EPC, O&M, technology providers
- `activities`: Calls, meetings, notes, tasks
- `relationships`: Connections between contacts/accounts

**Supporting Tables**:
- `user_hierarchy`: Organizational reporting structure
- `notifications`: In-app notification queue
- `admin_activity_logs`: Audit trail
- `media_vault_files`: File metadata (actual files in Storage)

**Storage Buckets**:
- `company-assets`: Company logos, branding files
- `avatars`: User profile pictures
- `media-vault`: Opportunity/account documents (site photos, contracts, etc.)

---

### 12.3 Security Architecture

```
SECURITY LAYERS
════════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────┐
│  Layer 1: Authentication (Supabase Auth + 2FA)                │
│  - Email/password validation                                  │
│  - Optional 2FA (TOTP/Email OTP)                              │
│  - Session management (JWT tokens)                            │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│  Layer 2: Row-Level Security (PostgreSQL RLS)                │
│  - Every table has RLS enabled                                │
│  - Policies check: user_id, role, ownership                   │
│  - Example: Internal users see only their entities            │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│  Layer 3: File Security (Supabase Storage)                    │
│  - Signed URLs (time-limited, 1 hour)                         │
│  - Bucket policies (RLS-like for files)                       │
│  - GPS verification for site photos                           │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│  Layer 4: Audit Trail (Activity Logs)                         │
│  - All actions logged (create, update, delete)                │
│  - User, timestamp, IP address recorded                       │
│  - 1-year retention for compliance                            │
└───────────────────────────────────────────────────────────────┘
```

**Row-Level Security (RLS)**:
- Every table has RLS enabled
- Policies enforce data visibility based on user role and ownership
- Example: Internal users can view entities they created or are assigned to; Admins can view all

**Authentication Flow**:
1. User enters credentials
2. Supabase Auth validates against `auth.users` table
3. If valid + 2FA enabled, Edge Function generates TOTP challenge
4. User submits code
5. Edge Function validates code
6. JWT token issued with user_id and role claims
7. Frontend stores token in secure httpOnly cookie
8. All API requests include token for RLS policy evaluation

**File Security**:
- Files stored in Supabase Storage (not publicly accessible)
- Signed URLs generated on-demand (valid 1 hour)
- Bucket policies enforce: only owners or admins can access files

---

### 12.4 Data Flow Example: Creating an Opportunity

**Frontend**:
1. User fills form, clicks "Create"
2. React component validates input client-side
3. Calls `createOpportunity()` function from `api/opportunities.ts`
4. Function uses Supabase client to insert row into `opportunities` table

**Backend (Supabase)**:
5. Request arrives with JWT token
6. RLS policy evaluates: Is user authenticated? (Yes → proceed)
7. Insert executed:
   ```sql
   INSERT INTO opportunities (
     company_name, value, stage, re_type, priority, assigned_to, created_by
   ) VALUES (
     'ABC Manufacturing', 50000000, 'Prospect', 'Solar PV', 'High', 'user-id', 'user-id'
   )
   ```
8. Database triggers:
   - `updated_at` timestamp set to NOW()
   - Activity log entry created
   - If fuzzy match finds existing account, `linked_account_id` populated
9. New row returned to frontend with generated `id`

**Frontend (continued)**:
10. Success toast notification shown to user
11. Opportunity list re-fetched (TanStack Query cache invalidated)
12. New opportunity appears in list

---

### 12.5 Realtime Features

**Supabase Realtime**:
- WebSocket connection established on login
- Subscribes to changes on key tables (opportunities, activities, notifications)
- When another user creates/updates record, change broadcast to all connected clients
- Frontend updates UI without page refresh

**Example**: Sam logs a call → Activity created → Realtime broadcasts → All logged-in users see new activity in Recent Activity feed immediately.

---

### 12.6 Mobile Architecture

**Purpose**: The system implements a mobile-first responsive design ensuring optimal experience across all device sizes.

#### 12.6.1 Responsive Breakpoints

**Tailwind CSS Breakpoints**:
```
Mobile:      < 640px   (sm)
Tablet:      640-1023px (sm to lg)
Desktop:     ≥ 1024px  (lg)
```

**Component Visibility Patterns**:
```typescript
// Sidebar: Desktop only
<div className="hidden lg:flex lg:w-64 ...">

// Bottom Navigation: Mobile/Tablet only
<div className="lg:hidden fixed bottom-0 ...">

// Responsive Grid: 1 col mobile, 2 col tablet, 3 col desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

#### 12.6.2 Touch-Optimized Interactions

**Minimum Touch Targets**:
- **WCAG AAA Standard**: 44px × 44px minimum
- **Implementation**: All interactive elements (buttons, nav icons, cards) meet or exceed
- **Validation**: Automated accessibility testing in CI/CD

**Gesture Support**:
1. **Pull-to-Refresh**: Available on all list views
   - iOS-style loading spinner
   - Haptic feedback on trigger
   - Prevents accidental activation (requires 80px pull)

2. **Swipe Actions**: Context-sensitive quick actions
   - Swipe left on opportunity card → Archive, Edit, Share
   - Swipe right on notification → Mark as read, Delete
   - Visual feedback with reveal animation

3. **Long Press**: Alternative to right-click
   - Long press on card → Context menu
   - 500ms delay before activation
   - Haptic feedback on trigger

**Scroll Behavior**:
- Smooth scrolling with momentum
- Scroll-to-top button appears after 400px scroll
- Sticky headers remain visible during scroll
- Infinite scroll pagination (loads 20 items at a time)

#### 12.6.3 Performance Optimization for Mobile

**Code Splitting**:
- Route-based lazy loading reduces initial bundle size
- Critical CSS inlined in HTML
- Non-critical components loaded on-demand

**Example**:
```typescript
// Lazy load admin panel (only for admins)
const AdminPanel = lazy(() => import('./pages/Admin'))

// Lazy load heavy charting library
const VelocityDashboard = lazy(() => import('./components/crm/VelocityDashboard'))
```

**Image Optimization**:
- Responsive images with srcset
- WebP format with JPEG fallback
- Lazy loading for images below fold
- Blurhash placeholders during load

**Network Optimization**:
- Service Worker caches static assets
- Offline mode with IndexedDB fallback
- Optimistic UI updates (immediate feedback, sync in background)
- Debounced search (300ms delay prevents excessive API calls)

**Bundle Size Targets**:
- Initial JS bundle: < 200KB gzipped
- CSS bundle: < 50KB gzipped
- Time to Interactive (TTI): < 3s on 3G network

#### 12.6.4 Safe Area Handling

**iPhone Notch/Dynamic Island**:
```css
/* Bottom navigation respects safe area */
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Top header avoids status bar */
.header {
  padding-top: env(safe-area-inset-top);
}
```

**Android Navigation Bar**:
- Automatic padding on devices with on-screen navigation
- Gestures work with Android 10+ gesture navigation

#### 12.6.5 Progressive Web App (PWA) Features

**Capabilities**:
1. **Add to Home Screen**: Install as native-like app
2. **Offline Mode**: Core features work without internet
3. **Push Notifications**: In-app notifications + browser push (opt-in)
4. **Background Sync**: Queue actions when offline, sync when online

**PWA Manifest**:
```json
{
  "name": "Enterprise CRM",
  "short_name": "CRM",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#f97316",
  "background_color": "#ffffff",
  "icons": [...]
}
```

**Service Worker Strategy**:
- **Cache First**: Static assets (JS, CSS, fonts)
- **Network First**: API calls (opportunities, accounts, etc.)
- **Stale While Revalidate**: User avatars, company logos

#### 12.6.6 Mobile-Specific UI Components

**Bottom Sheet** (used for filters, actions):
- Swipe up to expand
- Swipe down to dismiss
- Backdrop overlay (50% opacity)
- Spring animation (120ms duration)

**Pull-Down Refresh Indicator**:
- Native iOS-style spinner
- Material Design spinner on Android
- Positioned 60px from top
- Rotates during pull, fades on release

**Floating Action Button (FAB)**:
- Fixed position, bottom-right corner
- 56px diameter (meets touch target minimum)
- Elevation shadow (4dp)
- Pulse animation on page load
- Morphs into sheet when tapped

**Segmented Control** (Mine/Team toggle):
- iOS-style pill selector
- Smooth slide animation (200ms)
- Haptic feedback on selection change
- Full-width on mobile, auto-width on desktop

#### 12.6.7 Accessibility on Mobile

**Screen Reader Support**:
- All icons have aria-labels
- Semantic HTML (nav, main, article, aside)
- Focus management for modals
- Announce page title changes

**Keyboard Navigation** (Bluetooth keyboard on tablet):
- Tab order follows visual layout
- Skip links to main content
- Escape key closes modals
- Arrow keys navigate lists

**Contrast & Readability**:
- WCAG AAA contrast ratios (7:1 for body text)
- Minimum font size: 16px (prevents iOS auto-zoom)
- Line height: 1.5 for body text
- Max line length: 75 characters

**Reduced Motion**:
- Respects `prefers-reduced-motion` media query
- Disables animations (pulse, slide, fade)
- Maintains instant state changes
- Toggle in Settings → Accessibility

#### 12.6.8 Mobile Testing Strategy

**Real Device Testing**:
- iOS: iPhone SE (small), iPhone 14 Pro (notch), iPad Air (tablet)
- Android: Pixel 6 (standard), Samsung Galaxy S23 (large), OnePlus (gesture nav)

**Emulator Testing**:
- Chrome DevTools responsive mode
- Xcode Simulator (iOS)
- Android Studio emulator

**Network Conditions**:
- 4G: Fast connection
- 3G: Moderate connection
- Slow 3G: Worst-case scenario
- Offline: Complete loss of connectivity

**Automated Testing**:
- Lighthouse CI for performance scores
- Axe for accessibility compliance
- BrowserStack for cross-device compatibility

#### 12.6.9 Mobile-First Development Workflow

**CSS Approach**:
```css
/* Default styles = Mobile */
.button {
  font-size: 14px;
  padding: 8px 16px;
}

/* Tablet and above */
@media (min-width: 768px) {
  .button {
    font-size: 16px;
    padding: 10px 20px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .button {
    font-size: 18px;
    padding: 12px 24px;
  }
}
```

**Component Design**:
1. Design mobile layout first
2. Add tablet optimizations
3. Enhance for desktop
4. Never rely on hover states (touch devices don't hover)
5. Provide touch and mouse interactions

**Performance Budget**:
- Every feature must load in < 3s on 3G
- Every interaction must respond in < 100ms
- Every animation must run at 60fps
- Every API call must complete in < 2s or show loading state

---

## 13. Glossary

**2FA (Two-Factor Authentication)**: Security mechanism requiring two forms of verification (password + code from authenticator app or email).

**Account**: A company entity in the CRM (counterparty, prospect, client, partner, competitor).

**Activity**: A logged interaction (call, meeting, email, note, site visit) with a contact or related to an opportunity.

**BESS (Battery Energy Storage System)**: Energy storage technology often paired with solar PV for dispatchability.

**BOI (Board of Investment)**: Thai government agency offering incentives to promoted industries (relevant for solar economics).

**COD (Commercial Operation Date)**: Date when solar system is commissioned and begins producing energy.

**Contact**: An individual person in the CRM (decision-maker, stakeholder, influencer).

**Counterparty**: The customer in a PPA (the company purchasing solar energy).

**EPC (Engineering, Procurement, Construction)**: Contractor who designs and builds solar projects.

**IC (Investment Committee)**: Internal governance body that approves investment decisions (relevant for quality gates).

**LCOE (Levelized Cost of Energy)**: Average cost per kWh over project lifetime (key metric for comparing solar to grid rate).

**LOI (Letter of Intent)**: Preliminary agreement preceding final contract (occurs in Term Sheet stage).

**O&M (Operations & Maintenance)**: Ongoing service for operating and maintaining solar systems.

**Opportunity**: A potential deal or project in the sales pipeline.

**Partner**: External company providing services (EPC, O&M, technology supplier, consultant).

**PPA (Power Purchase Agreement)**: Contract where customer buys solar energy at agreed rate for agreed term (typically 20-25 years).

**Project**: An active solar installation (post-PPA execution).

**Quality Gate**: Stage-specific checklist ensuring investment rigor before advancing opportunity to next stage.

**RE (Renewable Energy)**: Solar PV, wind, biomass, hydro, etc.

**Relationship**: A connection between two contacts or between contact and account (used for network graph).

**RLS (Row-Level Security)**: Database security mechanism restricting data access based on user attributes.

**SET (Stock Exchange of Thailand)**: Thailand's stock exchange (source of Thai Taxonomy classification).

**Stakeholder**: Any individual with interest or influence in an opportunity (decision-maker, influencer, gatekeeper, etc.).

**TDD (Technical Due Diligence)**: Engineering assessment of solar project feasibility (includes shading analysis, structural review, yield estimate).

**Thai Taxonomy**: Thailand's official sector classification system for companies.

**TOTP (Time-Based One-Time Password)**: Algorithm used by authenticator apps for 2FA codes.

**Velocity**: Speed of deal progression through pipeline (measured in days per stage, conversion rates).

**Win Probability**: Estimated likelihood of closing a deal (percentage, used for weighted pipeline forecasting).

---

## Appendices

### Appendix A: Keyboard Shortcuts

- `Ctrl+K` (Windows) / `Cmd+K` (Mac): Open search
- `Ctrl+N` (Windows) / `Cmd+N` (Mac): Create new entity (opens Quick Add)
- `Ctrl+/` (Windows) / `Cmd+/` (Mac): Show keyboard shortcuts help
- `Esc`: Close modal or dialog
- `Tab`: Navigate form fields
- `Enter`: Submit form (when focused on submit button)

---

### Appendix B: Browser Compatibility

**Fully Supported**:
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

**Limited Support** (core features work, some UI issues):
- Safari 12-13
- Chrome 80-89

**Not Supported**:
- Internet Explorer (any version)
- Opera Mini
- UC Browser

**Recommended**: Chrome 120+ for best performance and feature support.

---

### Appendix C: Mobile App Usage

**Responsive Web App**: No native app required, access via mobile browser.

**Optimizations**:
- Touch-friendly buttons (44px min height)
- Swipe gestures for list navigation
- Bottom navigation bar (thumb-reachable)
- Reduced data transfer on mobile networks
- GPS integration for Media Vault uploads

**Recommended Workflow**:
- Use mobile for: Activity logging, quick lookups, site visit documentation
- Use desktop for: Bulk data entry, complex analysis, admin functions

---

### Appendix D: Support and Contact

**Technical Support**:
- **Email**: support@yourcompany.com
- **Response Time**: Within 24 hours (business days)

**Admin/Super Admin**:
- For urgent issues or account lockouts, contact your Super Admin directly

**Feature Requests**:
- Submit via: Settings → Send Feedback
- Or email: product@yourcompany.com

**Documentation Updates**:
- This manual is versioned and updated quarterly
- Check for latest version: Docs folder in project repo

---

**End of Manual**

---

*This Operating and Systems Manual is a living document. Feedback and suggestions for improvement are welcome. Please contact the Product team with any questions or comments.*