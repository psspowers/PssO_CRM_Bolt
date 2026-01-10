# Technical Architecture Addendum

**Version:** 1.1
**Last Updated:** January 10, 2026
**Target Audience:** Software Developers, DevOps Engineers, Technical Architects
**System:** Enterprise CRM for Renewable Energy Investment

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Frontend Architecture](#2-frontend-architecture)
3. [State Management](#3-state-management)
4. [Database Schema](#4-database-schema)
5. [Row-Level Security (RLS)](#5-row-level-security-rls)
6. [Edge Functions](#6-edge-functions)
7. [API Layer](#7-api-layer)
8. [Authentication Flow](#8-authentication-flow)
9. [Mobile-First Implementation](#9-mobile-first-implementation)
10. [Performance Optimization](#10-performance-optimization)
11. [Testing Strategy](#11-testing-strategy)
12. [Build and Deployment](#12-build-and-deployment)
13. [Development Workflow](#13-development-workflow)

---

## 1. Introduction

### 1.1 Purpose of This Document

This addendum provides technical implementation details for developers working on the CRM system. It complements the Operating and Systems Manual by diving deep into code architecture, database design, and development practices.

### 1.2 Prerequisites

Developers should be familiar with:
- React 18+ (Hooks, Context API, Suspense)
- TypeScript (interfaces, generics, type inference)
- Tailwind CSS (utility-first approach, responsive design)
- Supabase (PostgreSQL, RLS, Edge Functions, Storage)
- Git workflow (feature branches, pull requests, code review)

### 1.3 Technology Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│ FRONTEND STACK                                          │
├─────────────────────────────────────────────────────────┤
│ React 18.3.1          │ UI framework                    │
│ TypeScript 5.5.3      │ Type safety                     │
│ Vite 5.4.1            │ Build tool & dev server         │
│ Tailwind CSS 3.4.11   │ Styling framework               │
│ shadcn/ui             │ Component library               │
│ TanStack Query 5.56.2 │ Data fetching & caching         │
│ React Router 6.26.2   │ Client-side routing             │
│ date-fns 3.6.0        │ Date manipulation               │
│ Recharts 2.12.7       │ Charts & data visualization     │
│ zod 3.23.8            │ Runtime validation              │
│ react-hook-form 7.53  │ Form management                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ BACKEND STACK                                           │
├─────────────────────────────────────────────────────────┤
│ Supabase PostgreSQL   │ Relational database             │
│ Supabase Auth         │ Authentication & 2FA            │
│ Supabase Storage      │ File uploads                    │
│ Supabase Edge Fns     │ Serverless functions (Deno)     │
│ Supabase Realtime     │ WebSocket subscriptions         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Project Structure

```
src/
├── App.tsx                      # Root component, routing
├── main.tsx                     # Entry point, providers
├── index.css                    # Global styles, Tailwind imports
│
├── components/
│   ├── AppLayout.tsx            # Main layout wrapper
│   ├── ErrorBoundary.tsx        # Error handling HOC
│   ├── theme-provider.tsx       # Dark/light mode context
│   │
│   ├── crm/                     # CRM-specific components
│   │   ├── Header.tsx           # Top navigation bar
│   │   ├── Sidebar.tsx          # Desktop sidebar navigation
│   │   ├── BottomNav.tsx        # Mobile bottom navigation
│   │   ├── MagicMenu.tsx        # Quick actions menu
│   │   ├── OpportunityCard.tsx  # Opportunity list item
│   │   ├── OpportunityForm.tsx  # Opportunity create/edit
│   │   └── ...                  # 30+ CRM components
│   │
│   ├── screens/                 # Full-page screen components
│   │   ├── HomeScreen.tsx       # Dashboard
│   │   ├── OpportunitiesScreen.tsx  # Opportunities list
│   │   ├── AccountsScreen.tsx   # Accounts list
│   │   └── ...                  # 8 screen components
│   │
│   ├── ui/                      # shadcn/ui primitives
│   │   ├── button.tsx           # Button component
│   │   ├── dialog.tsx           # Modal dialog
│   │   ├── select.tsx           # Dropdown select
│   │   └── ...                  # 50+ UI primitives
│   │
│   └── admin/                   # Admin panel components
│       ├── UserManagement.tsx   # User CRUD
│       ├── OrgChart.tsx         # Organizational hierarchy
│       └── ...
│
├── contexts/
│   ├── AuthContext.tsx          # Authentication state
│   └── AppContext.tsx           # Global app state
│
├── hooks/
│   ├── use-toast.ts             # Toast notifications
│   ├── use-mobile.tsx           # Responsive breakpoint detection
│   ├── useKeyboardShortcuts.tsx # Keyboard navigation
│   └── ...
│
├── lib/
│   ├── supabase.ts              # Supabase client singleton
│   ├── utils.ts                 # Utility functions (cn, formatters)
│   │
│   └── api/                     # API layer (Supabase queries)
│       ├── opportunities.ts     # Opportunity CRUD
│       ├── accounts.ts          # Account CRUD
│       ├── users.ts             # User management
│       └── ...
│
├── types/
│   └── crm.ts                   # TypeScript interfaces
│
├── data/                        # Mock data (for development)
│   ├── mockOpportunities.ts
│   └── ...
│
└── pages/                       # Route-level pages
    ├── Index.tsx                # Home route
    ├── Login.tsx                # Login page
    ├── Admin.tsx                # Admin panel
    └── ...
```

### 2.2 Component Patterns

#### 2.2.1 Container/Presenter Pattern

**Container Components** (Smart):
- Fetch data using TanStack Query
- Manage local state
- Handle user interactions
- Pass data to presenters

**Presenter Components** (Dumb):
- Receive props
- Render UI
- No business logic
- Reusable across contexts

**Example**:
```typescript
// Container: OpportunitiesScreen.tsx
export function OpportunitiesScreen() {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchOpportunities
  });

  return <OpportunityList opportunities={opportunities} isLoading={isLoading} />;
}

// Presenter: OpportunityList.tsx
interface OpportunityListProps {
  opportunities: Opportunity[];
  isLoading: boolean;
}

export function OpportunityList({ opportunities, isLoading }: OpportunityListProps) {
  if (isLoading) return <Skeleton />;

  return (
    <div className="space-y-4">
      {opportunities.map(opp => (
        <OpportunityCard key={opp.id} opportunity={opp} />
      ))}
    </div>
  );
}
```

#### 2.2.2 Compound Component Pattern

Used for complex components with multiple sub-components (e.g., Dialog, Accordion).

**Example**:
```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Opportunity</DialogTitle>
    </DialogHeader>
    <OpportunityForm opportunity={opportunity} />
  </DialogContent>
</Dialog>
```

#### 2.2.3 Render Props Pattern

Used for flexible composition (e.g., ErrorBoundary, authentication guards).

**Example**:
```typescript
<RequireAuth>
  {(user) => (
    <AdminPanel user={user} />
  )}
</RequireAuth>
```

### 2.3 Routing Architecture

**React Router v6** with lazy loading:

```typescript
// App.tsx
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<HomeScreen />} />
          <Route path="opportunities" element={<OpportunitiesScreen />} />
          <Route path="admin" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Admin />
            </Suspense>
          } />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Route Protection**:
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
```

---

## 3. State Management

### 3.1 State Management Philosophy

**Local State First**: Use `useState` for component-local state

**Lift State Up**: Share state between siblings by lifting to parent

**Context for Global State**: Use Context API for truly global state (auth, theme, app settings)

**Server State**: Use TanStack Query for server-side data (opportunities, accounts, etc.)

### 3.2 AuthContext

**Responsibilities**:
- Manage authentication state (user, session)
- Provide login/logout functions
- Handle 2FA verification
- Expose user profile and role

**Implementation**:
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        (async () => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('crm_users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            setUser({ ...session.user, ...profile });
          } else {
            setUser(null);
          }
          setLoading(false);
        })();
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = { user, loading, signIn, signOut, verify2FA };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### 3.3 TanStack Query for Server State

**Query Keys Convention**:
```typescript
// Good: Hierarchical, descriptive
['opportunities', { stage: 'Prospect', assignedTo: userId }]
['accounts', accountId, 'contacts']
['users', 'hierarchy']

// Bad: Flat, ambiguous
['data']
['list']
```

**Query Example**:
```typescript
// lib/api/opportunities.ts
export async function fetchOpportunities(filters?: OpportunityFilters) {
  let query = supabase
    .from('opportunities')
    .select('*, assigned_user:crm_users(name, avatar_url)')
    .order('created_at', { ascending: false });

  if (filters?.stage) {
    query = query.eq('stage', filters.stage);
  }

  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Component usage
const { data: opportunities, isLoading, error } = useQuery({
  queryKey: ['opportunities', filters],
  queryFn: () => fetchOpportunities(filters),
  staleTime: 30_000, // 30 seconds
});
```

**Mutation Example**:
```typescript
const createOpportunityMutation = useMutation({
  mutationFn: createOpportunity,
  onSuccess: () => {
    // Invalidate and refetch opportunities list
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    toast.success('Opportunity created!');
  },
  onError: (error) => {
    toast.error(`Failed to create: ${error.message}`);
  },
});

// Usage in component
const handleSubmit = (data: OpportunityFormData) => {
  createOpportunityMutation.mutate(data);
};
```

---

## 4. Database Schema

### 4.1 Core Tables

#### 4.1.1 crm_users

**Purpose**: User accounts and profiles (extends Supabase auth.users)

```sql
CREATE TABLE crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'internal',
  position TEXT,
  department TEXT,
  phone TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  password_change_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'internal', 'external'))
);

CREATE INDEX idx_crm_users_email ON crm_users(email);
CREATE INDEX idx_crm_users_role ON crm_users(role);
CREATE INDEX idx_crm_users_auth_user_id ON crm_users(auth_user_id);
```

#### 4.1.2 opportunities

**Purpose**: Deal pipeline management

```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Prospect',
  priority TEXT DEFAULT 'Medium',
  win_probability INTEGER DEFAULT 50,
  re_type TEXT, -- Solar PV, Wind, BESS, etc.
  capacity NUMERIC, -- MW
  expected_close_date DATE,
  industry TEXT,
  location TEXT,
  linked_account_id UUID REFERENCES accounts(id),
  assigned_to UUID REFERENCES crm_users(id),
  created_by UUID REFERENCES crm_users(id) NOT NULL,
  notes TEXT,
  clickup_link TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_stage CHECK (stage IN ('Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Won', 'Lost')),
  CONSTRAINT valid_priority CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  CONSTRAINT valid_probability CHECK (win_probability BETWEEN 0 AND 100)
);

CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX idx_opportunities_linked_account_id ON opportunities(linked_account_id);
CREATE INDEX idx_opportunities_expected_close_date ON opportunities(expected_close_date);
```

#### 4.1.3 opportunity_stage_history

**Purpose**: Track stage transitions for velocity analytics

```sql
CREATE TABLE opportunity_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  changed_by UUID REFERENCES crm_users(id) NOT NULL,
  days_in_stage INTEGER,

  CONSTRAINT valid_from_stage CHECK (from_stage IN ('Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Won', 'Lost') OR from_stage IS NULL),
  CONSTRAINT valid_to_stage CHECK (to_stage IN ('Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Won', 'Lost'))
);

CREATE INDEX idx_stage_history_opportunity_id ON opportunity_stage_history(opportunity_id);
CREATE INDEX idx_stage_history_changed_at ON opportunity_stage_history(changed_at);
```

**Trigger for Automatic Logging**:
```sql
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  last_change_date TIMESTAMPTZ;
  days_in_prev_stage INTEGER;
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Get last stage change timestamp
    SELECT changed_at INTO last_change_date
    FROM opportunity_stage_history
    WHERE opportunity_id = NEW.id
    ORDER BY changed_at DESC
    LIMIT 1;

    -- Calculate days in previous stage
    IF last_change_date IS NOT NULL THEN
      days_in_prev_stage := EXTRACT(DAY FROM NOW() - last_change_date);
    ELSE
      days_in_prev_stage := EXTRACT(DAY FROM NOW() - OLD.created_at);
    END IF;

    -- Insert history record
    INSERT INTO opportunity_stage_history (
      opportunity_id, from_stage, to_stage, changed_by, days_in_stage
    ) VALUES (
      NEW.id, OLD.stage, NEW.stage, auth.uid(), days_in_prev_stage
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER opportunity_stage_change_trigger
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION log_stage_change();
```

#### 4.1.4 user_hierarchy

**Purpose**: Organizational reporting structure for hierarchical visibility

```sql
CREATE TABLE user_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES crm_users(id) ON DELETE CASCADE NOT NULL,
  parent_user_id UUID REFERENCES crm_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_hierarchy_user_id ON user_hierarchy(user_id);
CREATE INDEX idx_hierarchy_parent_user_id ON user_hierarchy(parent_user_id);
```

**Recursive CTE for Subordinates**:
```sql
CREATE OR REPLACE FUNCTION get_subordinates(manager_id UUID)
RETURNS TABLE(subordinate_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    -- Base case: direct reports
    SELECT user_id AS subordinate_id
    FROM user_hierarchy
    WHERE parent_user_id = manager_id

    UNION ALL

    -- Recursive case: reports of reports
    SELECT h.user_id
    FROM user_hierarchy h
    INNER JOIN subordinates s ON h.parent_user_id = s.subordinate_id
  )
  SELECT subordinate_id FROM subordinates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 4.1.5 market_news

**Purpose**: Market intelligence tracking for The Pulse (Market Intel tab)

```sql
CREATE TABLE market_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  impact_type TEXT NOT NULL CHECK (impact_type IN ('opportunity', 'threat', 'neutral')),
  source_type TEXT DEFAULT 'Analyst',
  related_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  news_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_impact_type CHECK (impact_type IN ('opportunity', 'threat', 'neutral'))
);

CREATE INDEX idx_market_news_account ON market_news(related_account_id);
CREATE INDEX idx_market_news_created_at ON market_news(created_at DESC);
CREATE INDEX idx_market_news_news_date ON market_news(news_date DESC);
CREATE INDEX idx_market_news_impact ON market_news(impact_type);
```

**RLS Policies**:
```sql
-- All authenticated users can read all news
CREATE POLICY "Read news"
  ON market_news
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can post news (assigned to them)
CREATE POLICY "Write news"
  ON market_news
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own news
CREATE POLICY "Update own news"
  ON market_news
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Users can delete their own news
CREATE POLICY "Delete own news"
  ON market_news
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
```

**Analyst Rotation Function**:
```sql
-- Smart rotation: selects accounts that need market scanning
CREATE OR REPLACE FUNCTION fetch_daily_scan_targets(batch_size INT DEFAULT 30)
RETURNS TABLE (name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_ids UUID[];
BEGIN
  -- Find accounts needing scanning (never scanned or oldest scans first)
  SELECT array_agg(id) INTO selected_ids
  FROM (
    SELECT id
    FROM accounts
    WHERE status != 'Archived'
    ORDER BY last_market_scan_at ASC NULLS FIRST
    LIMIT batch_size
  ) sub;

  IF selected_ids IS NULL THEN
    RETURN;
  END IF;

  -- Update scan timestamps (atomic operation)
  UPDATE accounts
  SET last_market_scan_at = NOW()
  WHERE id = ANY(selected_ids);

  -- Return company names
  RETURN QUERY
  SELECT a.name
  FROM accounts a
  WHERE a.id = ANY(selected_ids)
  ORDER BY a.last_market_scan_at ASC NULLS FIRST;
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_daily_scan_targets TO authenticated;
```

**Account Schema Addition**:
```sql
-- Added to accounts table to support rotation
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS last_market_scan_at TIMESTAMPTZ;

-- Index for rotation query performance
CREATE INDEX IF NOT EXISTS idx_accounts_last_scan
ON accounts(last_market_scan_at ASC NULLS FIRST);
```

### 4.2 Database Conventions

**Naming**:
- Tables: snake_case, plural (e.g., `opportunities`, `crm_users`)
- Columns: snake_case (e.g., `company_name`, `assigned_to`)
- Foreign Keys: `{referenced_table}_id` (e.g., `account_id`, `user_id`)
- Indexes: `idx_{table}_{column}` (e.g., `idx_opportunities_stage`)
- Triggers: `{table}_{action}_trigger` (e.g., `opportunity_stage_change_trigger`)

**Timestamps**:
- Always use `TIMESTAMPTZ` (timezone-aware)
- Include `created_at` and `updated_at` on all tables
- Use trigger for automatic `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**UUIDs**:
- Use UUID v4 for all primary keys (`gen_random_uuid()`)
- Benefits: Distributed generation, no collision risk, URL-safe
- Avoid auto-incrementing integers (leaks information about record count)

---

## 5. Row-Level Security (RLS)

### 5.1 RLS Philosophy

**Security by Default**: Every table has RLS enabled, restrictive by default

**Principle of Least Privilege**: Users can only access data they explicitly need

**Explicit Policies**: No implicit trust, every access path requires policy

### 5.2 Policy Patterns

#### 5.2.1 Opportunities (Hierarchical Visibility)

```sql
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own opportunities
CREATE POLICY "Users can view own opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  );

-- Policy: Managers can view team opportunities (hierarchical)
CREATE POLICY "Managers can view team opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (
    assigned_to IN (
      SELECT subordinate_id FROM get_subordinates(auth.uid())
    )
  );

-- Policy: Admins can view all opportunities
CREATE POLICY "Admins can view all opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM crm_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Policy: Users can insert opportunities
CREATE POLICY "Users can insert opportunities"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- Policy: Users can update own opportunities
CREATE POLICY "Users can update own opportunities"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  );

-- Policy: Users can delete own opportunities
CREATE POLICY "Users can delete own opportunities"
  ON opportunities FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
  );
```

#### 5.2.2 CRM Users (Role-Based Access)

```sql
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own profile
CREATE POLICY "Users can view own profile"
  ON crm_users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy: Users can view internal users (for assignment dropdowns)
CREATE POLICY "Users can view internal users"
  ON crm_users FOR SELECT
  TO authenticated
  USING (role IN ('internal', 'admin', 'super_admin'));

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON crm_users FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM crm_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Policy: Only admins can insert users
CREATE POLICY "Only admins can insert users"
  ON crm_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM crm_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
  ON crm_users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = OLD.role); -- Prevent self-role escalation

-- Policy: Admins can update any user
CREATE POLICY "Admins can update any user"
  ON crm_users FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM crm_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM crm_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );
```

### 5.3 Testing RLS Policies

**Impersonate User**:
```sql
-- Set session to specific user for testing
SET request.jwt.claim.sub = 'user-uuid-here';

-- Test query
SELECT * FROM opportunities;

-- Reset
RESET request.jwt.claim.sub;
```

**Test Script** (run as admin):
```sql
-- Test 1: User can only see own opportunities
SET request.jwt.claim.sub = 'alice-uuid';
SELECT COUNT(*) FROM opportunities; -- Should only show Alice's
RESET request.jwt.claim.sub;

-- Test 2: Manager can see team opportunities
SET request.jwt.claim.sub = 'manager-uuid';
SELECT COUNT(*) FROM opportunities; -- Should show manager's + subordinates'
RESET request.jwt.claim.sub;

-- Test 3: External user sees nothing
SET request.jwt.claim.sub = 'external-uuid';
SELECT COUNT(*) FROM opportunities; -- Should show 0
RESET request.jwt.claim.sub;
```

---

## 6. Edge Functions

### 6.1 Architecture

**Deno Runtime**: Edge Functions run on Deno (not Node.js)
- TypeScript native support
- Secure by default (no file system access except /tmp)
- Web-standard APIs (fetch, Request, Response)

**Location**: `supabase/functions/{function-name}/index.ts`

### 6.2 create-user Edge Function

**Purpose**: Create new user accounts with proper auth.users + crm_users records

**File**: `supabase/functions/create-user/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    // Parse request body
    const { email, password, name, role, position, department } = await req.json()

    // Validate required fields
    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client (service role key)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Create auth.users record
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) throw authError

    // Create crm_users record
    const { data: crmUser, error: crmError } = await supabaseAdmin
      .from('crm_users')
      .insert({
        auth_user_id: authUser.user.id,
        email,
        name,
        role,
        position,
        department,
        password_change_required: true,
      })
      .select()
      .single()

    if (crmError) throw crmError

    // Log activity
    await supabaseAdmin.from('admin_activity_logs').insert({
      action: 'user_created',
      entity_type: 'user',
      entity_id: crmUser.id,
      performed_by: req.headers.get('X-User-ID'), // Set by frontend
      details: { email, role },
    })

    return new Response(
      JSON.stringify({ user: crmUser }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 6.3 two-factor-auth Edge Function

**Purpose**: Generate and verify TOTP codes for 2FA

**File**: `supabase/functions/two-factor-auth/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.49.4"
import * as OTPAuth from "npm:otpauth@9.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { action, userId, token } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (action === 'generate') {
      // Generate new TOTP secret
      const secret = new OTPAuth.Secret({ size: 20 })
      const totp = new OTPAuth.TOTP({
        issuer: 'Enterprise CRM',
        label: userId,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      })

      // Store secret in database (encrypted at rest by Supabase)
      await supabase
        .from('crm_users')
        .update({ two_factor_secret: secret.base32 })
        .eq('id', userId)

      // Generate QR code URI
      const uri = totp.toString()

      return new Response(
        JSON.stringify({ secret: secret.base32, uri }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'verify') {
      // Fetch user's secret
      const { data: user } = await supabase
        .from('crm_users')
        .select('two_factor_secret')
        .eq('id', userId)
        .single()

      if (!user?.two_factor_secret) {
        return new Response(
          JSON.stringify({ error: '2FA not enabled' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify token
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.two_factor_secret),
      })

      const delta = totp.validate({ token, window: 1 }) // Allow 1 period before/after
      const valid = delta !== null

      if (valid) {
        // Enable 2FA on first successful verification
        await supabase
          .from('crm_users')
          .update({ two_factor_enabled: true })
          .eq('id', userId)
      }

      return new Response(
        JSON.stringify({ valid }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 6.4 Calling Edge Functions from Frontend

```typescript
// lib/api/users.ts
export async function createUser(userData: CreateUserRequest) {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  // Get current user ID for activity log
  const { data: { user } } = await supabase.auth.getUser()

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'X-User-ID': user?.id || '',
      },
      body: JSON.stringify(userData),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create user')
  }

  return response.json()
}
```

---

## 7. API Layer

### 7.1 API Organization

**File Structure**:
```
lib/api/
├── index.ts               # Re-exports all APIs
├── types.ts               # Shared types
├── opportunities.ts       # Opportunity CRUD + queries
├── accounts.ts            # Account CRUD + queries
├── contacts.ts            # Contact CRUD + queries
├── partners.ts            # Partner CRUD + queries
├── projects.ts            # Project CRUD + queries
├── activities.ts          # Activity CRUD + queries
├── users.ts               # User management
├── relationships.ts       # Relationship graph
├── media.ts               # Media vault uploads
├── settings.ts            # User settings
└── velocity.ts            # Velocity analytics
```

### 7.2 API Function Patterns

#### 7.2.1 Fetch Single Record

```typescript
export async function fetchOpportunity(id: string): Promise<Opportunity> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      assigned_user:crm_users!assigned_to(id, name, avatar_url),
      created_by_user:crm_users!created_by(id, name),
      linked_account:accounts(id, company_name, industry)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Opportunity not found')

  return data as Opportunity
}
```

#### 7.2.2 Fetch List with Filters

```typescript
interface OpportunityFilters {
  stage?: string[]
  priority?: string[]
  assignedTo?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export async function fetchOpportunities(
  filters: OpportunityFilters = {}
): Promise<Opportunity[]> {
  let query = supabase
    .from('opportunities')
    .select(`
      *,
      assigned_user:crm_users!assigned_to(id, name, avatar_url)
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.stage && filters.stage.length > 0) {
    query = query.in('stage', filters.stage)
  }

  if (filters.priority && filters.priority.length > 0) {
    query = query.in('priority', filters.priority)
  }

  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }

  if (filters.search) {
    query = query.or(`company_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Opportunity[]
}
```

#### 7.2.3 Create Record

```typescript
export async function createOpportunity(
  opportunity: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>
): Promise<Opportunity> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      ...opportunity,
      created_by: user.id,
      assigned_to: opportunity.assigned_to || user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as Opportunity
}
```

#### 7.2.4 Update Record

```typescript
export async function updateOpportunity(
  id: string,
  updates: Partial<Opportunity>
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from('opportunities')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Opportunity
}
```

#### 7.2.5 Delete Record

```typescript
export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

### 7.3 Error Handling

**Custom Error Types**:
```typescript
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class UnauthorizedError extends APIError {
  constructor() {
    super('Unauthorized', 'UNAUTHORIZED', 401)
  }
}
```

**Error Handler Utility**:
```typescript
export function handleSupabaseError(error: PostgrestError): never {
  switch (error.code) {
    case 'PGRST116':
      throw new NotFoundError('Resource')
    case '23505':
      throw new APIError('Duplicate entry', 'DUPLICATE', 409)
    case '23503':
      throw new APIError('Referenced record not found', 'FOREIGN_KEY', 400)
    default:
      throw new APIError(error.message, error.code, 500)
  }
}
```

---

## 8. Authentication Flow

### 8.1 Login Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│ 1. User enters email + password                          │
└───────────────────┬──────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Frontend calls supabase.auth.signInWithPassword()    │
└───────────────────┬──────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Supabase Auth validates credentials                   │
│    - Check email exists in auth.users                    │
│    - Verify password hash                                │
└───────────────────┬──────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────────────┐
│ 4. If valid, check if 2FA enabled                       │
│    - Query crm_users.two_factor_enabled                  │
└───────────────────┬──────────────────────────────────────┘
                    ▼
         ┌──────────┴──────────┐
         │                     │
    2FA Enabled          2FA Disabled
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ 5a. Show 2FA    │   │ 5b. Issue JWT   │
│     verification│   │     token       │
│     screen      │   │     + session   │
└────────┬────────┘   └────────┬────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ 6. User enters  │   │ 7. Redirect to  │
│    TOTP code    │   │    dashboard    │
└────────┬────────┘   └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ 7. Call two-factor-auth Edge Function   │
│    - Verify TOTP code                   │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
 Valid    Invalid
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ Issue  │  │ Error  │
│ JWT    │  │ message│
└───┬────┘  └────────┘
    │
    ▼
┌────────────────┐
│ Redirect to    │
│ dashboard      │
└────────────────┘
```

### 8.2 Session Management

**JWT Structure**:
```json
{
  "sub": "user-uuid",
  "email": "user@company.com",
  "role": "authenticated",
  "aal": "aal2",  // Authentication Assurance Level (aal2 = 2FA verified)
  "exp": 1704470400,
  "iat": 1704384000
}
```

**Session Duration**:
- Without "Remember Me": 1 hour
- With "Remember Me": 30 days
- Configurable in Supabase dashboard

**Session Refresh**:
```typescript
// Automatic refresh handled by Supabase client
// Manual refresh if needed:
const { data, error } = await supabase.auth.refreshSession()
```

### 8.3 Password Change Flow

**First Login** (forced password change):
```typescript
// Check if password change required
const { data: user } = await supabase
  .from('crm_users')
  .select('password_change_required')
  .eq('id', userId)
  .single()

if (user.password_change_required) {
  // Show password change modal
  // Prevent access to app until changed
}
```

**Change Password**:
```typescript
export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error

  // Clear password_change_required flag
  const { data: { user } } = await supabase.auth.getUser()
  await supabase
    .from('crm_users')
    .update({ password_change_required: false })
    .eq('auth_user_id', user!.id)
}
```

---

## 9. Mobile-First Implementation

### 9.1 Responsive Component Pattern

```typescript
// BottomNav.tsx (Mobile) + Sidebar.tsx (Desktop)
export function Navigation() {
  const isMobile = useMediaQuery('(max-width: 1023px)')

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex lg:w-64" />

      {/* Mobile Bottom Navigation */}
      <BottomNav className="lg:hidden fixed bottom-0 w-full" />
    </>
  )
}
```

### 9.2 Touch Gesture Handling

**Pull-to-Refresh**:
```typescript
export function OpportunitiesList() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    setRefreshing(false)
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {refreshing && <RefreshIndicator />}
      {/* ... list content ... */}
    </div>
  )
}
```

**Swipe Actions**:
```typescript
export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const [swipeX, setSwipeX] = useState(0)

  const handleSwipe = (deltaX: number) => {
    if (deltaX < -100) {
      // Swiped left: Show actions
      setSwipeX(-100)
    } else if (deltaX > 100) {
      // Swiped right: Dismiss
      setSwipeX(0)
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Actions revealed on swipe */}
      <div className="absolute right-0 top-0 h-full flex">
        <button className="px-4 bg-orange-500">Edit</button>
        <button className="px-4 bg-red-500">Archive</button>
      </div>

      {/* Main card content */}
      <div
        style={{ transform: `translateX(${swipeX}px)` }}
        className="transition-transform"
      >
        {/* Card content */}
      </div>
    </div>
  )
}
```

### 9.3 Performance Budget Enforcement

**Webpack Bundle Analyzer** (visualize bundle size):
```bash
npm run build
npx vite-bundle-visualizer
```

**Lighthouse CI** (automated performance testing):
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

**lighthouserc.json**:
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": ["http://localhost:4173"]
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "interactive": ["error", { "maxNumericValue": 3000 }],
        "total-byte-weight": ["error", { "maxNumericValue": 300000 }]
      }
    }
  }
}
```

---

## 10. Performance Optimization

### 10.1 React Performance

**Memo HOC** (prevent unnecessary re-renders):
```typescript
export const OpportunityCard = memo(({ opportunity }: { opportunity: Opportunity }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if opportunity changed
  return prevProps.opportunity.id === nextProps.opportunity.id &&
         prevProps.opportunity.updated_at === nextProps.opportunity.updated_at
})
```

**useMemo** (expensive computations):
```typescript
export function VelocityDashboard({ opportunities }: { opportunities: Opportunity[] }) {
  const velocityMetrics = useMemo(() => {
    // Expensive calculation
    return calculateVelocity(opportunities)
  }, [opportunities])

  return <Chart data={velocityMetrics} />
}
```

**useCallback** (stable function references):
```typescript
export function OpportunityList() {
  const handleEdit = useCallback((id: string) => {
    // Edit logic
  }, []) // Empty deps = function never changes

  return opportunities.map(opp => (
    <OpportunityCard key={opp.id} onEdit={handleEdit} />
  ))
}
```

### 10.2 TanStack Query Optimization

**Prefetching**:
```typescript
export function OpportunitiesList() {
  const queryClient = useQueryClient()

  const handleHover = (opportunityId: string) => {
    // Prefetch detail on hover
    queryClient.prefetchQuery({
      queryKey: ['opportunity', opportunityId],
      queryFn: () => fetchOpportunity(opportunityId),
    })
  }

  return opportunities.map(opp => (
    <OpportunityCard onMouseEnter={() => handleHover(opp.id)} />
  ))
}
```

**Background Refetching**:
```typescript
useQuery({
  queryKey: ['opportunities'],
  queryFn: fetchOpportunities,
  staleTime: 30_000, // 30 seconds
  cacheTime: 300_000, // 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
})
```

### 10.3 Image Optimization

**Lazy Loading**:
```typescript
<img
  src={opportunity.image_url}
  loading="lazy"
  alt={opportunity.company_name}
  className="w-full h-48 object-cover"
/>
```

**Responsive Images**:
```typescript
<img
  src={user.avatar_url}
  srcSet={`
    ${user.avatar_url}?w=100 1x,
    ${user.avatar_url}?w=200 2x,
    ${user.avatar_url}?w=300 3x
  `}
  sizes="(max-width: 640px) 100px, 200px"
  alt={user.name}
/>
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Vitest** for unit testing:

```typescript
// lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, calculateDaysInStage } from './utils'

describe('formatCurrency', () => {
  it('formats Thai Baht correctly', () => {
    expect(formatCurrency(50000000)).toBe('฿50M')
    expect(formatCurrency(1200000000)).toBe('฿1.2B')
    expect(formatCurrency(500000)).toBe('฿500K')
  })
})

describe('calculateDaysInStage', () => {
  it('calculates days between two dates', () => {
    const from = new Date('2026-01-01')
    const to = new Date('2026-01-15')
    expect(calculateDaysInStage(from, to)).toBe(14)
  })
})
```

### 11.2 Integration Tests

**Testing Library** for component testing:

```typescript
// components/crm/OpportunityCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { OpportunityCard } from './OpportunityCard'

const mockOpportunity = {
  id: '123',
  company_name: 'ABC Manufacturing',
  value: 50000000,
  stage: 'Prospect',
  priority: 'High',
}

describe('OpportunityCard', () => {
  it('renders opportunity details', () => {
    render(<OpportunityCard opportunity={mockOpportunity} />)

    expect(screen.getByText('ABC Manufacturing')).toBeInTheDocument()
    expect(screen.getByText('฿50M')).toBeInTheDocument()
    expect(screen.getByText('Prospect')).toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<OpportunityCard opportunity={mockOpportunity} onEdit={onEdit} />)

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledWith('123')
  })
})
```

### 11.3 E2E Tests

**Playwright** for end-to-end testing:

```typescript
// e2e/opportunity-flow.spec.ts
import { test, expect } from '@playwright/test'

test('create opportunity flow', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name=email]', 'test@company.com')
  await page.fill('[name=password]', 'password123')
  await page.click('button[type=submit]')

  // Navigate to opportunities
  await page.click('text=Opportunities')

  // Open create modal
  await page.click('button:has-text("New Opportunity")')

  // Fill form
  await page.fill('[name=company_name]', 'Test Company')
  await page.fill('[name=value]', '50000000')
  await page.selectOption('[name=stage]', 'Prospect')

  // Submit
  await page.click('button:has-text("Create")')

  // Verify success
  await expect(page.locator('text=Test Company')).toBeVisible()
})
```

---

## 12. Build and Deployment

### 12.1 Build Process

**Vite Configuration**:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB
  },
})
```

**Build Commands**:
```bash
# Development build
npm run build:dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

### 12.2 Environment Variables

**.env.example**:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional
VITE_APP_VERSION=1.0.0
VITE_SENTRY_DSN=
```

**Loading Environment Variables**:
```typescript
// lib/config.ts
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  app: {
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
} as const
```

### 12.3 Deployment

**Vercel** (recommended):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "routes": [
    { "src": "/assets/(.*)", "headers": { "cache-control": "max-age=31536000, immutable" } },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

---

## 13. Development Workflow

### 13.1 Git Workflow

**Branch Strategy**:
```
main (production)
  └─ develop (staging)
       ├─ feature/add-velocity-dashboard
       ├─ fix/opportunity-stage-bug
       └─ refactor/api-layer
```

**Commit Message Convention**:
```
feat: Add velocity dashboard
fix: Correct stage transition trigger
refactor: Extract API layer into separate files
docs: Update technical architecture addendum
test: Add unit tests for opportunity utils
chore: Update dependencies
```

### 13.2 Code Review Checklist

- [ ] TypeScript types defined for all new functions
- [ ] RLS policies tested for new tables
- [ ] Mobile responsive (tested on < 640px)
- [ ] Accessibility: keyboard navigation, ARIA labels
- [ ] Performance: no unnecessary re-renders, lazy loading where appropriate
- [ ] Error handling: try-catch for async operations
- [ ] Unit tests for business logic
- [ ] Integration tests for critical flows
- [ ] Documentation: JSDoc comments for public APIs

### 13.3 Development Commands

```bash
# Start dev server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate production build
npm run build

# Preview production build
npm run preview
```

---

## Appendix A: Database Migrations

**Running Migrations**:

All migrations are located in `supabase/migrations/` and are automatically applied when deploying to Supabase.

**Local Development**:
```bash
# Apply migrations locally
supabase db reset

# Create new migration
supabase migration new add_new_feature
```

**Migration Template**:
```sql
/*
  # Migration Title

  1. Changes
    - Description of table/column changes

  2. Security
    - RLS policies added/modified
*/

-- Your SQL here
CREATE TABLE ...;
ALTER TABLE ...;
CREATE POLICY ...;
```

---

## Appendix B: Useful Resources

**Documentation**:
- [React 18 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com/docs)

**Tools**:
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vite DevTools](https://vitejs.dev/guide/)
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

**End of Technical Architecture Addendum**

*For user-facing documentation, refer to the Operating and Systems Manual.*
*For API documentation, refer to inline JSDoc comments in source code.*
