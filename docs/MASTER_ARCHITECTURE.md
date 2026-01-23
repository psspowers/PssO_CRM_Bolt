# Master Architecture Document

**Version:** 2.0
**Last Updated:** January 23, 2026
**System Name:** PSS Orange - Enterprise CRM for Renewable Energy Investment
**Status:** Production
**Document Type:** Master Reference

---

## Document Purpose

This is the **single source of truth** for the PSS Orange CRM system architecture. It consolidates high-level system design, architectural decisions, technology stack rationale, data flow, and integration points. This document should be read first by:

- New developers joining the project
- Technical architects evaluating the system
- DevOps engineers planning deployment
- Product managers understanding capabilities
- External auditors reviewing the system

---

## Quick Navigation

- **For Developers**: See [Technical Architecture Addendum](./TECHNICAL_ARCHITECTURE_ADDENDUM.md)
- **For End Users**: See [Operating and Systems Manual](./OPERATING_AND_SYSTEMS_MANUAL.md)
- **For Quick Reference**: See [Quick Reference Guide](./QUICK_REFERENCE_GUIDE.md)
- **For Database Details**: See [Database Audit Summary](./DATABASE_AUDIT_SUMMARY.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Architectural Principles](#4-architectural-principles)
5. [System Architecture](#5-system-architecture)
6. [Data Architecture](#6-data-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Integration Architecture](#8-integration-architecture)
9. [Performance Architecture](#9-performance-architecture)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Key Features Summary](#11-key-features-summary)
12. [Critical Workflows](#12-critical-workflows)
13. [Architectural Decisions](#13-architectural-decisions)
14. [Future Roadmap](#14-future-roadmap)

---

## 1. Executive Summary

### 1.1 What is PSS Orange?

PSS Orange is a purpose-built Enterprise CRM system for renewable energy investment firms managing solar PV projects, Power Purchase Agreements (PPAs), and counterparty relationships across Thailand and Southeast Asia. The system streamlines deal flow from origination through execution with built-in underwriting workflows aligned with institutional investment committee processes.

### 1.2 Business Context

**Target Users:**
- Investment analysts tracking solar PV opportunities
- Relationship managers maintaining counterparty connections
- Credit analysts performing due diligence
- Portfolio managers monitoring active projects
- Senior executives reviewing pipeline velocity

**Core Business Value:**
- Reduces time-to-close for deals by 30% through streamlined workflows
- Provides real-time visibility into pipeline health
- Ensures data consistency across teams
- Supports institutional-grade investment decision-making
- Tracks relationship networks for deal sourcing

### 1.3 System Characteristics

| Attribute | Value |
|-----------|-------|
| **Architecture Style** | Client-server, serverless backend |
| **Primary Database** | PostgreSQL (Supabase) |
| **Authentication** | JWT with 2FA support |
| **API Style** | RESTful + GraphQL-like queries (PostgREST) |
| **Deployment** | Edge-deployed (Vercel + Supabase) |
| **Mobile Support** | Responsive web (iOS Safari, Android Chrome) |
| **Offline Support** | Service worker caching (read-only) |
| **Real-time Features** | WebSocket subscriptions (Supabase Realtime) |

---

## 2. System Overview

### 2.1 Domain Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        CORE ENTITIES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │ Opportunities│◄────────┤   Accounts   │                     │
│  │  (Deals)     │         │  (Companies) │                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                              │
│         │                        │                              │
│         ▼                        ▼                              │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Projects   │         │   Contacts   │                     │
│  │   (Active)   │         │   (People)   │                     │
│  └──────────────┘         └──────────────┘                     │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Partners   │         │  Activities  │                     │
│  │ (EPC/O&M)    │         │(Timeline Log)│                     │
│  └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Business Processes

**Sales Pipeline:**
```
Prospect → Qualified → Proposal → Negotiation → Term Sheet → Won
                                                                ↓
                                                          Auto-Create
                                                             Project
```

**Project Lifecycle:**
```
Won → Engineering → Permit/EPC → Construction → Commissioning → Operational
```

**Credit Evaluation:**
```
Opportunity Created → Risk Profile Assessment → Credit Committee Review → Approval/Rejection
```

---

## 3. Technology Stack

### 3.1 Frontend Stack

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| **Framework** | React | 18.3.1 | Industry standard, excellent ecosystem |
| **Language** | TypeScript | 5.5.3 | Type safety, better IDE support |
| **Build Tool** | Vite | 5.4.1 | Fast HMR, modern ES modules |
| **Styling** | Tailwind CSS | 3.4.11 | Utility-first, responsive by default |
| **UI Components** | shadcn/ui | Latest | High-quality, accessible components |
| **State Management** | React Context + TanStack Query | 5.56.2 | Separation of UI state and server state |
| **Routing** | React Router | 6.26.2 | Standard routing solution |
| **Forms** | React Hook Form + Zod | 7.53 / 3.23.8 | Performance + validation |
| **Charts** | Recharts | 2.12.7 | React-native charts, composable |
| **Date Handling** | date-fns | 3.6.0 | Lightweight, tree-shakeable |

**Why These Choices?**

- **React + TypeScript**: Industry-standard combination with excellent hiring pool
- **Vite**: 10x faster than Webpack in development, minimal config
- **Tailwind CSS**: Rapid development, consistent design system, small bundle
- **TanStack Query**: Best-in-class server state management, built-in caching
- **shadcn/ui**: Copy-paste components (not a dependency), full customization

### 3.2 Backend Stack

| Category | Technology | Rationale |
|----------|-----------|-----------|
| **Database** | Supabase PostgreSQL | Fully managed, excellent DX, built-in RLS |
| **Auth** | Supabase Auth | JWT-based, 2FA support, session management |
| **Storage** | Supabase Storage | S3-compatible, signed URLs, image transforms |
| **Edge Functions** | Deno Runtime | Secure by default, TypeScript native |
| **Real-time** | Supabase Realtime | WebSocket subscriptions, presence |
| **Search** | PostgreSQL Full-Text Search | Native, performant for text search |

**Why Supabase?**

1. **Integrated Platform**: Auth, DB, Storage, Functions in one platform
2. **Row-Level Security**: Database-enforced authorization (not app-level)
3. **Real-time Capabilities**: Built-in WebSocket subscriptions
4. **Developer Experience**: Excellent CLI, auto-generated TypeScript types
5. **Cost Effective**: Generous free tier, predictable pricing
6. **Open Source**: Can self-host if needed (PostgreSQL + PostgREST)

### 3.3 Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend Hosting** | Vercel | Edge deployment, instant rollback |
| **Database Hosting** | Supabase Cloud | Fully managed PostgreSQL |
| **CDN** | Cloudflare (via Vercel) | Global edge caching |
| **Monitoring** | Supabase Dashboard | Query performance, error logs |
| **Version Control** | Git | Source control |

---

## 4. Architectural Principles

### 4.1 Core Principles

1. **Security by Default**
   - Every database table has Row-Level Security (RLS) enabled
   - No data access without explicit policy
   - Principle of least privilege
   - Secrets never in client code

2. **Mobile-First Design**
   - All interfaces designed for 375px first
   - Touch-optimized interactions
   - Bottom navigation for thumb reach
   - Progressive enhancement for desktop

3. **Data Integrity is Paramount**
   - Never use destructive operations (DROP, DELETE CASCADE)
   - Audit trail for all critical changes
   - Foreign key constraints everywhere
   - Validation at multiple layers (client, database, edge functions)

4. **Performance Budget Enforcement**
   - Initial bundle size < 300KB gzipped
   - First Contentful Paint < 2 seconds
   - Time to Interactive < 3 seconds
   - Lighthouse score > 90

5. **Separation of Concerns**
   - UI State: React Context
   - Server State: TanStack Query
   - Business Logic: API layer (`lib/api/`)
   - Presentation: Component files
   - Data Access: Database + RLS policies

6. **Progressive Disclosure**
   - Don't show everything at once
   - Contextual actions revealed on demand
   - Modal workflows for complex operations
   - Wizards for multi-step processes

### 4.2 Design Patterns

**Frontend Patterns:**
- Container/Presenter (Smart/Dumb components)
- Compound Components (Dialog, Accordion)
- Render Props (Authentication guards)
- Custom Hooks (Shared logic)

**Backend Patterns:**
- Repository Pattern (API layer abstractions)
- Command Query Separation (Read vs Write operations)
- Event-Driven (Database triggers for automation)
- Materialized Views (Pre-computed hierarchies)

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite Bundle)                                 │  │
│  │  - UI Components (shadcn/ui)                             │  │
│  │  - State Management (Context + TanStack Query)           │  │
│  │  - Routing (React Router)                                │  │
│  └──────────────────────┬───────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTPS (TLS 1.3)
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                         ▼    EDGE TIER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Vercel Edge Network (CDN + Serverless)                  │  │
│  │  - Static Assets (HTML, JS, CSS, Images)                 │  │
│  │  - Edge Functions (Optional)                             │  │
│  └──────────────────────┬───────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                         ▼    API TIER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Platform                                       │  │
│  │  ┌────────────────┐  ┌────────────────┐                 │  │
│  │  │  PostgREST API │  │ Edge Functions │                 │  │
│  │  │  (Auto-gen)    │  │ (Deno Runtime) │                 │  │
│  │  └────────┬───────┘  └────────┬───────┘                 │  │
│  │           │                   │                          │  │
│  │           └───────────┬───────┘                          │  │
│  │                       ▼                                  │  │
│  │           ┌───────────────────────┐                      │  │
│  │           │    Auth Service       │                      │  │
│  │           │    (JWT + 2FA)        │                      │  │
│  │           └───────────┬───────────┘                      │  │
│  │                       │                                  │  │
│  └───────────────────────┼──────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                         ▼    DATA TIER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL 15 (Supabase)                                │  │
│  │  - CRM Tables (opportunities, accounts, contacts, etc.)  │  │
│  │  - Row-Level Security Policies                           │  │
│  │  - Database Triggers & Functions                         │  │
│  │  - Full-Text Search Indexes                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Storage (S3-compatible)                        │  │
│  │  - Avatars Bucket                                        │  │
│  │  - Company Assets Bucket                                 │  │
│  │  - Media Vault Buckets                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supabase Realtime (WebSocket)                           │  │
│  │  - Presence (Online users)                               │  │
│  │  - Broadcast (Stage changes, notifications)              │  │
│  │  - Database Changes (Activity feed updates)              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Frontend Architecture

**Directory Structure:**
```
src/
├── components/
│   ├── crm/              # Business components (OpportunityCard, etc.)
│   ├── screens/          # Full-page components (OpportunitiesScreen)
│   ├── admin/            # Admin panel components
│   ├── settings/         # Settings-related components
│   ├── profile/          # Profile page components
│   └── ui/               # Reusable UI primitives (Button, Dialog)
├── contexts/
│   ├── AuthContext.tsx   # Authentication state
│   ├── AppContext.tsx    # Global app state
│   └── PresenceContext.tsx # Real-time presence
├── hooks/                # Custom React hooks
├── lib/
│   ├── api/              # API layer (Supabase queries)
│   ├── supabase.ts       # Supabase client singleton
│   └── utils.ts          # Utility functions
├── types/
│   └── crm.ts            # TypeScript type definitions
├── pages/                # Route-level pages
└── data/                 # Seed data for development
```

**Data Flow:**
```
User Action (Click)
    ↓
Event Handler in Component
    ↓
API Function in lib/api/
    ↓
Supabase Client
    ↓
PostgREST API (applies RLS)
    ↓
PostgreSQL Database
    ↓
Response (data or error)
    ↓
TanStack Query Cache
    ↓
React Re-render with New Data
```

---

## 6. Data Architecture

### 6.1 Core Schema

**Entity Relationship Diagram:**
```
┌─────────────────┐         ┌─────────────────┐
│   crm_users     │         │  opportunities  │
│─────────────────│         │─────────────────│
│ id (PK)         │◄───┐    │ id (PK)         │
│ name            │    │    │ company_name    │
│ email (unique)  │    │    │ value           │
│ role            │    └────┤ assigned_to (FK)│
│ reports_to (FK) │         │ created_by (FK) │
│ is_active       │         │ stage           │
└─────────────────┘         │ re_type[]       │
         │                  │ location        │
         │                  └─────────────────┘
         │                           │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ user_hierarchy  │         │     accounts    │
│─────────────────│         │─────────────────│
│ manager_id (FK) │         │ id (PK)         │
│ subordinate_id  │         │ name            │
│ depth           │         │ sector          │
└─────────────────┘         │ industry        │
                            │ sub_industry    │
                            └─────────────────┘
                                     │
                                     │
                                     ▼
                            ┌─────────────────┐
                            │    contacts     │
                            │─────────────────│
                            │ id (PK)         │
                            │ full_name       │
                            │ account_id (FK) │
                            │ tags[]          │
                            └─────────────────┘
```

### 6.2 Key Tables

| Table | Purpose | Row Count (Est.) |
|-------|---------|------------------|
| `crm_users` | User accounts and profiles | 50-100 |
| `opportunities` | Deal pipeline | 500-2,000 |
| `accounts` | Companies/counterparties | 200-500 |
| `contacts` | Individual stakeholders | 1,000-3,000 |
| `partners` | EPC/O&M/Tech vendors | 50-150 |
| `projects` | Active project portfolio | 100-300 |
| `activities` | Timeline log (calls, notes) | 10,000-50,000 |
| `opportunity_stage_history` | Stage transition audit | 5,000-20,000 |
| `market_news` | Market intelligence feed | 500-2,000 |
| `user_hierarchy` | Flattened org chart | 200-500 |

### 6.3 Data Types and Enums

**Opportunity Stages:**
```
Prospect → Qualified → Proposal → Negotiation → Term Sheet → Won | Lost
```

**Project Status:**
```
Won → Engineering → Permit/EPC → Construction → Commissioning → Operational
```

**User Roles:**
```
external < internal < admin < super_admin
```

**RE Types:**
```
['PV - Roof', 'PV - Ground', 'PV - Floating', 'BESS', 'Wind']
```

---

## 7. Security Architecture

### 7.1 Authentication Flow

```
┌────────────────────────────────────────────────────────────────┐
│  Login Request (email + password)                              │
└───────────────────┬────────────────────────────────────────────┘
                    ▼
┌────────────────────────────────────────────────────────────────┐
│  Supabase Auth validates credentials                           │
│  - Checks email exists in auth.users                           │
│  - Verifies bcrypt password hash                               │
└───────────────────┬────────────────────────────────────────────┘
                    ▼
         ┌──────────┴──────────┐
         │                     │
    Valid Credentials    Invalid Credentials
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ Check 2FA       │   │ Return 401      │
│ Enabled?        │   │ Error           │
└────────┬────────┘   └─────────────────┘
         │
    ┌────┴────┐
    │         │
  YES        NO
    │         │
    ▼         ▼
┌──────┐  ┌──────────────────┐
│ Show │  │ Issue JWT        │
│ 2FA  │  │ + Refresh Token  │
│Screen│  └────────┬─────────┘
└──┬───┘           │
   │               │
   ▼               │
┌──────────────┐   │
│ Verify TOTP  │   │
│ Code (6-dig) │   │
└──────┬───────┘   │
       │           │
  ┌────┴────┐      │
  │         │      │
Valid   Invalid    │
  │         │      │
  │         ▼      │
  │    ┌────────┐  │
  │    │ Error  │  │
  │    └────────┘  │
  │                │
  └────────┬───────┘
           ▼
┌────────────────────────────┐
│ Create session             │
│ - JWT in memory (never LS) │
│ - Refresh token in cookie  │
│ - Session: 30 days default │
└────────────────────────────┘
```

### 7.2 Authorization Model (RLS)

**Row-Level Security Policies:**

Every table follows this pattern:
```sql
-- Example: opportunities table

-- SELECT: Users can view own + team opportunities
CREATE POLICY "View own and team opportunities"
ON opportunities FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()                    -- Own records
  OR assigned_to = auth.uid()                -- Assigned to user
  OR assigned_to IN (                        -- Team records
    SELECT subordinate_id
    FROM user_hierarchy
    WHERE manager_id = auth.uid()
  )
  OR EXISTS (                                -- Admin override
    SELECT 1 FROM crm_users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- INSERT: Users can create opportunities
CREATE POLICY "Create opportunities"
ON opportunities FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()                    -- Must set self as creator
);

-- UPDATE: Users can update own + assigned opportunities
CREATE POLICY "Update own opportunities"
ON opportunities FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
);

-- DELETE: Only creator can delete
CREATE POLICY "Delete own opportunities"
ON opportunities FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
);
```

**Key Security Features:**

1. **Database-Enforced Authorization**: Not app-level (can't be bypassed)
2. **Hierarchical Visibility**: Managers see subordinates' data
3. **Admin Override**: Admins have full visibility
4. **Explicit Deny by Default**: No policy = no access
5. **Audit Trail**: All changes logged with timestamps and user IDs

### 7.3 Session Management

**ClickUp-Style Session Management** (as of January 14, 2026):

- **Default Session**: 30 days (not 1-3 hours)
- **Extended Session**: 90 days (with "Remember Me")
- **Activity-Based Refresh**: Silent token refresh every hour if user active
- **Activity Detection**: Mouse, keyboard, clicks, scroll, touch events
- **No Interruptions**: No modal popups for session extension
- **Seamless UX**: Like ClickUp, Notion, Linear

**Why This Approach?**
- CRM work is episodic (users return after days/weeks)
- Reduces friction and login fatigue
- Maintains security with refresh token rotation
- Background activity tracking ensures active sessions stay alive

---

## 8. Integration Architecture

### 8.1 External Integrations

| System | Integration Type | Purpose | Status |
|--------|-----------------|---------|--------|
| **ClickUp** | URL Linking | Project management task tracking | ✅ Active |
| **Google Drive** | URL Linking | Document storage for deals | ✅ Active |
| **Email (SMTP)** | Supabase Edge Function | User invites, password resets | ✅ Active |
| **Authenticator Apps** | TOTP (RFC 6238) | 2FA verification | ✅ Active |

**Future Integrations (Planned):**
- Slack/Line notifications
- Email sync (Gmail/Outlook)
- Calendar integration (Google Calendar)
- E-signature (DocuSign API)
- Accounting (QuickBooks/Xero)

### 8.2 Edge Functions

**Deployed Functions:**

1. **create-user** (`supabase/functions/create-user/`)
   - Creates auth.users + crm_users atomically
   - Used by Admin panel
   - Requires service role key

2. **delete-user** (`supabase/functions/delete-user/`)
   - Soft-deletes user (sets is_active = false)
   - Logs action in admin_activity_logs

3. **reset-user-password** (`supabase/functions/reset-user-password/`)
   - Generates password reset link
   - Sends email via Supabase SMTP

4. **two-factor-auth** (`supabase/functions/two-factor-auth/`)
   - Generates TOTP secrets
   - Verifies 6-digit codes
   - Returns QR code URI

**Edge Function Pattern:**
```typescript
// Standard structure for all edge functions
import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.49.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Function logic here
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## 9. Performance Architecture

### 9.1 Frontend Optimization Strategies

**Code Splitting:**
- Route-based lazy loading (React.lazy)
- Dynamic imports for heavy components
- Manual chunks for vendor libraries

**Bundle Size Management:**
```javascript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      vendor: ['react', 'react-dom', 'react-router-dom'],
      ui: ['@radix-ui/*'],
      charts: ['recharts'],
    },
  },
}
```

**Result:**
- Initial bundle: ~280KB gzipped
- Vendor chunk: ~150KB (cached long-term)
- Route chunks: 20-50KB each

**React Performance:**
- `React.memo()` for expensive list items
- `useMemo()` for computed values
- `useCallback()` for stable function references
- Virtual scrolling for long lists (>100 items)

**TanStack Query Optimization:**
- Prefetching on hover/focus
- Stale-while-revalidate strategy
- Background refetching
- Optimistic updates for mutations

### 9.2 Database Optimization

**Indexes:**
```sql
-- High-cardinality columns
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_opportunities_stage_assigned ON opportunities(stage, assigned_to);

-- Full-text search
CREATE INDEX idx_accounts_name_gin ON accounts USING GIN(to_tsvector('english', name));
```

**Query Patterns:**
- Use `maybeSingle()` instead of `single()` (graceful handling)
- Select only needed columns (not `SELECT *`)
- Batch queries when possible
- Use database functions for complex aggregations

**Performance Targets:**
- Database queries: < 100ms p95
- API responses: < 200ms p95
- Page load: < 2 seconds LCP
- Interaction: < 100ms TTI

---

## 10. Deployment Architecture

### 10.1 Environments

| Environment | Purpose | URL Pattern | Database |
|-------------|---------|-------------|----------|
| **Production** | Live system | `app.psspowers.com` | Supabase Prod |
| **Staging** | Pre-release testing | `staging.psspowers.com` | Supabase Staging |
| **Development** | Local development | `localhost:5173` | Supabase Dev |

### 10.2 Deployment Pipeline

```
Developer Push to GitHub
    ↓
GitHub Actions (CI)
    ├─ Run type check (tsc)
    ├─ Run linter (eslint)
    ├─ Run unit tests (vitest)
    └─ Build production bundle
    ↓
If all checks pass:
    ↓
Vercel Deployment
    ├─ Build Vite bundle
    ├─ Deploy to edge network
    ├─ Run smoke tests
    └─ Generate preview URL
    ↓
Manual approval (production only)
    ↓
Promote to production domain
    ↓
Rollback available (instant)
```

### 10.3 Monitoring & Observability

**What We Monitor:**

1. **Frontend Metrics:**
   - Core Web Vitals (LCP, FID, CLS)
   - JavaScript errors (Error Boundary catches)
   - API latency (TanStack Query DevTools)

2. **Backend Metrics:**
   - Database query performance
   - Edge function execution time
   - Auth success/failure rates
   - Storage upload success rates

3. **Business Metrics:**
   - Daily active users (DAU)
   - Opportunities created per day
   - Pipeline velocity (stage transitions)
   - User engagement (sessions per user)

**Tools:**
- Supabase Dashboard (database metrics)
- Vercel Analytics (frontend metrics)
- Browser DevTools (local debugging)

---

## 11. Key Features Summary

### 11.1 Deal Management

**Opportunity Pipeline:**
- Kanban-style stage management
- Drag-and-drop stage transitions
- Automatic stage history tracking
- Velocity analytics (days in stage)
- Quality Gates (checklist before stage advance)

**Thai Taxonomy Integration:**
- 3-level classification (Sector → Industry → Sub-Industry)
- 47 unique sub-industries
- Priority scoring (1-5 points)
- Base scoring (1-10 scale)
- Used for market intel targeting

### 11.2 Counterparty Risk Management

**Credit Committee Matrix:**
- **WHO**: Corporation type, age, sunset risk (35% weight)
- **WHERE**: Land ownership, lease terms, location integrity (20% weight)
- **HOW MUCH**: Financials (Net Worth, Revenue, D/E, ROCE, etc.) (45% weight)
- Automated scoring algorithm
- Rating output (AAA to D)

**Due Diligence Workflows:**
- Financial data import (Excel upload)
- Load analysis (demand curve modeling)
- Investment ROI modeling
- Document checklist (Media Vault)

### 11.3 Relationship Mapping

**Network Graph:**
- Visual relationship mapping
- Relationship types (Works At, Advisor To, JV Partner, etc.)
- Strength indicators (Weak, Medium, Strong)
- Multi-hop path finding (Nexus feature)
- Deal sourcing through connections

**Nexus Intelligence:**
- "Who connects me to this account?"
- Multi-step relationship paths
- Team collaboration (show team's connections)
- Bidirectional traversal

### 11.4 Market Intelligence (The Pulse)

**Activity Feed ("For You" Tab):**
- Real-time internal activity stream
- Stage changes, deal updates, notes
- Mentions and notifications
- Drip feed (10 items per load)

**Market Intel Tab:**
- News article tracking
- Impact classification (Opportunity, Threat, Neutral)
- Account linking
- Analyst rotation (daily targets)
- Interactive actions (Create Task, Create Deal)

**Analyst Console:**
- Daily scan targets (30 accounts)
- Smart rotation algorithm
- Bulk news entry
- Progress tracking

### 11.5 Team Collaboration

**Organizational Hierarchy:**
- Visual org chart (drag-and-drop)
- Reporting relationships
- Manager/subordinate visibility
- Hierarchical data access (RLS-enforced)

**Mine vs Team Toggle:**
- View own deals vs team deals
- Subordinate filtering
- Owner badges on team deals
- "Viewing as manager" indicators

**Activity Timeline:**
- Call logs, meeting notes, site visits
- WhatsApp conversation logs
- Attachment support
- Task creation from activities

---

## 12. Critical Workflows

### 12.1 User Onboarding

```
Admin creates user account
    ↓
User receives invite email
    ↓
User clicks link, sets password
    ↓
Force password change on first login
    ↓
(Optional) Setup 2FA
    ↓
Profile completion (avatar, phone)
    ↓
System tours/tooltips (first-time hints)
    ↓
User ready to work
```

### 12.2 Opportunity to Project

```
Create Opportunity (Stage: Prospect)
    ↓
Progress through stages (Qualified → Proposal → Negotiation → Term Sheet)
    ↓
Mark as Won
    ↓
AUTOMATIC TRIGGER: create_project_on_won()
    ↓
Project created with status "Won"
    ↓
Project progresses (Engineering → Permit/EPC → Construction → Commissioning → Operational)
```

### 12.3 Credit Evaluation

```
Opportunity created (Stage: Qualified)
    ↓
Navigate to Opportunity detail → Credit tab
    ↓
Import financial data (Excel or manual entry)
    ↓
Enter WHO, WHERE, HOW MUCH data
    ↓
System calculates score (weighted algorithm)
    ↓
Rating displayed (AAA to D)
    ↓
Export report for Credit Committee
    ↓
Approve/Reject → Update opportunity stage
```

---

## 13. Architectural Decisions

### 13.1 Why Single-Page Application (SPA)?

**Pros:**
- Rich, app-like user experience
- No page reloads = faster perceived performance
- Easier state management
- Better for mobile (PWA-ready)

**Cons:**
- Initial bundle size larger
- SEO challenges (mitigated with SSR if needed)
- JavaScript-heavy (requires modern browsers)

**Decision:** SPA is ideal for internal CRM (no SEO needed, controlled user base with modern browsers)

### 13.2 Why Supabase over Custom Backend?

**Alternatives Considered:**
- Custom Node.js + Express + PostgreSQL
- Firebase (NoSQL)
- AWS Amplify

**Why Supabase Won:**
1. PostgreSQL (relational model fits CRM perfectly)
2. Built-in Row-Level Security (database-enforced, not app-level)
3. Auto-generated TypeScript types from schema
4. Real-time subscriptions out of the box
5. Excellent developer experience (CLI, local dev)
6. Open source (can self-host if needed)
7. Integrated platform (Auth + DB + Storage + Functions)

### 13.3 Why Client-Side Rendering?

**Alternatives:**
- Server-Side Rendering (SSR) - Next.js
- Static Site Generation (SSG)

**Why CSR:**
- Internal tool (no SEO requirements)
- Authenticated routes (no pre-rendering benefit)
- Dynamic data (can't pre-render)
- Simpler deployment (static files)
- Better for real-time updates (WebSocket)

### 13.4 Why No Redis Cache?

**Question:** Why not add Redis for caching?

**Answer:**
- PostgreSQL query performance is excellent (< 50ms p95)
- TanStack Query provides client-side caching
- Adds complexity (cache invalidation)
- Supabase doesn't offer managed Redis
- Would require separate infrastructure

**Future:** May add if database queries exceed 200ms p95

### 13.5 Why Tailwind CSS?

**Alternatives:**
- Styled Components
- CSS Modules
- Material-UI

**Why Tailwind:**
- Utility-first = fast development
- No naming conventions needed (no BEM, SMACSS)
- Tree-shaking (only used classes in bundle)
- Responsive by default (breakpoint prefixes)
- Design system tokens (spacing, colors) built-in
- Excellent VSCode autocomplete

---

## 14. Future Roadmap

### 14.1 Short-Term (Q1-Q2 2026)

- [ ] Email sync integration (Gmail/Outlook)
- [ ] Calendar integration (Google Calendar)
- [ ] Slack/Line notifications
- [ ] Advanced reporting (custom dashboards)
- [ ] Mobile app (React Native)
- [ ] Offline mode (full CRUD)

### 14.2 Medium-Term (Q3-Q4 2026)

- [ ] AI-powered deal scoring
- [ ] Predictive analytics (win probability)
- [ ] Automated relationship discovery (LinkedIn scraping)
- [ ] E-signature integration (DocuSign)
- [ ] Financial modeling tool (Excel-like)
- [ ] Multi-currency support

### 14.3 Long-Term (2027+)

- [ ] White-label platform (multi-tenant)
- [ ] API for third-party integrations
- [ ] Marketplace for extensions
- [ ] ML-based lead scoring
- [ ] Automated due diligence (OCR + NLP)
- [ ] Blockchain integration (deal registry)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **PPA** | Power Purchase Agreement - Contract to buy electricity |
| **EPC** | Engineering, Procurement, Construction - Project delivery model |
| **O&M** | Operations & Maintenance - Post-commissioning services |
| **BESS** | Battery Energy Storage System |
| **CAPEX** | Capital Expenditure - Upfront project costs |
| **IRR** | Internal Rate of Return - Investment return metric |
| **RLS** | Row-Level Security - Database access control |
| **JWT** | JSON Web Token - Authentication token format |
| **TOTP** | Time-based One-Time Password - 2FA code algorithm |
| **Nexus** | Relationship path finder feature |
| **Quality Gate** | Checklist before stage advancement |
| **The Pulse** | Activity feed + market intelligence module |

---

## Appendix B: Contact & Support

**Technical Lead:** [Your Name]
**Email:** [your.email@psspowers.com]
**Documentation:** `/docs` folder in repository
**Issue Tracker:** GitHub Issues
**Deployment:** Vercel Dashboard
**Database:** Supabase Dashboard

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | 2026-01-23 | Initial comprehensive master architecture | System Auditor |
| 1.2 | 2026-01-14 | Session management update (ClickUp-style) | - |
| 1.1 | 2026-01-10 | Added Pulse and Nexus features | - |
| 1.0 | 2026-01-01 | Initial system launch | - |

---

**END OF MASTER ARCHITECTURE DOCUMENT**

*This document is maintained as the single source of truth for system architecture. All other documentation should reference this document for high-level architecture decisions and system design.*
