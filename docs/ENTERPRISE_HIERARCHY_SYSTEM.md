# Enterprise Hierarchy System

This document explains the Enterprise Hierarchy system implemented across Steps 1-4, including the database foundation, frontend components, and how they work together.

## Overview

The Enterprise Hierarchy system enables:
1. **Organization Chart Management** - Visual representation and editing of team structure
2. **Hierarchy-Based Data Access** - RLS policies that allow managers to see their team's data
3. **Efficient Subordinate Lookups** - Pre-computed hierarchy table for fast queries

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  UserManagement.tsx          │       OrgChart.tsx               │
│  - Role management           │       - Visual tree display      │
│  - Active/Inactive toggle    │       - Drag-and-drop editing    │
│  - View hierarchy (readonly) │       - Expand/collapse nodes    │
│  - Link to Org Chart         │       - Rebuild Hierarchy button │
│                              │       - PRIMARY hierarchy editor │
└──────────────────────────────┴───────────────┬──────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION                                 │
│                    org-hierarchy                                 │
├─────────────────────────────────────────────────────────────────┤
│  Actions:                                                        │
│  - get_users: Fetch users with direct reports count             │
│  - update_manager: Update reports_to with cycle prevention      │
│  - rebuild_hierarchy: Recalculate user_hierarchy table          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
├─────────────────────────────────────────────────────────────────┤
│  crm_users                   │       user_hierarchy              │
│  - id                        │       - manager_id                │
│  - name                      │       - subordinate_id            │
│  - email                     │       - depth                     │
│  - role                      │       - created_at                │
│  - reports_to ◄──────────────┼───────────────────────────────── │
│  - is_active                 │                                   │
└──────────────────────────────┴──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RLS POLICIES                                │
├─────────────────────────────────────────────────────────────────┤
│  Entity Tables (opportunities, accounts, contacts, etc.):       │
│                                                                  │
│  SELECT: User can see records where:                            │
│    - owner_id = current_user_id (own records)                   │
│    - owner_id IN user_hierarchy.subordinate_id (team records)   │
│    - user.role = 'admin' (admin sees all)                       │
│                                                                  │
│  INSERT/UPDATE/DELETE: Similar hierarchy-based logic            │
└─────────────────────────────────────────────────────────────────┘
```

## Important Design Decision: Single Source of Truth

**The OrgChart component is the ONLY place to manage reporting relationships.**

### Why?

1. **Edge Function Integration**: OrgChart uses the `org-hierarchy` edge function which:
   - Validates changes (prevents circular references)
   - Updates `crm_users.reports_to`
   - Automatically rebuilds the `user_hierarchy` table
   
2. **Cache Consistency**: If we allowed multiple ways to update `reports_to`:
   - Direct database updates would bypass the edge function
   - The `user_hierarchy` table would get out of sync
   - RLS policies would return incorrect results
   
3. **Audit Trail**: All changes go through the edge function, ensuring proper logging

### What UserManagement Does

- **Role Management**: Change user roles (admin, internal, external)
- **Active/Inactive Toggle**: Enable or disable user accounts
- **View Hierarchy (Read-Only)**: Shows who reports to whom
- **Link to Org Chart**: Directs admins to the proper tool for hierarchy changes

### What UserManagement Does NOT Do

- ~~Reports To Dropdown~~ - **REMOVED** to prevent bypassing edge function
- ~~Update Manager Function~~ - **REMOVED** to maintain cache consistency

## Database Schema

### crm_users Table (Modified)

```sql
ALTER TABLE crm_users ADD COLUMN reports_to UUID REFERENCES crm_users(id);
CREATE INDEX idx_crm_users_reports_to ON crm_users(reports_to);
```

The `reports_to` column stores the direct manager's user ID. A NULL value indicates a top-level user (no manager).

### user_hierarchy Table (New)

```sql
CREATE TABLE user_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  subordinate_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_id, subordinate_id)
);

CREATE INDEX idx_user_hierarchy_manager ON user_hierarchy(manager_id);
CREATE INDEX idx_user_hierarchy_subordinate ON user_hierarchy(subordinate_id);
```

This table stores the flattened hierarchy for efficient lookups. For example:
- If A → B → C (A manages B, B manages C)
- The table contains:
  - (A, B, 1) - A is direct manager of B
  - (B, C, 1) - B is direct manager of C
  - (A, C, 2) - A is indirect manager of C (depth 2)

## Frontend Components

### OrgChart.tsx (PRIMARY Hierarchy Editor)

Located at: `src/components/admin/OrgChart.tsx`

**Features:**
- **Visual Tree Display**: Shows hierarchy as expandable/collapsible tree
- **Drag-and-Drop**: Reassign managers by dragging users
- **Direct Reports Badge**: Shows count of direct reports per manager
- **Top-Level Drop Zone**: Drop users here to remove their manager
- **Rebuild Hierarchy Button**: Triggers recalculation of user_hierarchy table

**Key Functions:**
```typescript
// Fetch users with hierarchy data
const fetchUsers = async () => {
  // Calls org-hierarchy edge function with action: 'get_users'
  // Returns users with directReportsCount and directReportIds
}

// Update manager via drag-and-drop
const handleUpdateManager = async (userId: string, newManagerId: string | null) => {
  // Calls org-hierarchy edge function with action: 'update_manager'
  // Includes circular reference prevention
  // Automatically rebuilds hierarchy table
}
```

### UserManagement.tsx (User Administration)

Located at: `src/components/admin/UserManagement.tsx`

**Features:**
- **Role Management**: Change user roles (admin, internal, external)
- **Active/Inactive Toggle**: Enable or disable user accounts
- **View Hierarchy (Read-Only)**: Shows "Reports To" and "Direct Reports" columns
- **Link to Org Chart**: Button that navigates to the Org Chart tab

**What It Does NOT Do:**
- Does NOT have a "Reports To" dropdown
- Does NOT directly update the `reports_to` field
- Does NOT bypass the edge function

## Edge Function: org-hierarchy

**Actions:**

1. **get_users**: Fetches all users with computed direct reports data
2. **update_manager**: Updates a user's manager with validation
3. **rebuild_hierarchy**: Recalculates the entire user_hierarchy table

**Rebuild Algorithm:**
```
1. Clear existing user_hierarchy table
2. For each user with a manager:
   a. Walk up the chain from user to top
   b. Insert row for each manager-subordinate pair
   c. Track depth (1 for direct, 2 for skip-level, etc.)
```

## RLS Policies

The RLS policies use the user_hierarchy table for efficient access control:

```sql
-- Example: SELECT policy for opportunities
CREATE POLICY "Users can view own and team opportunities"
ON opportunities FOR SELECT
USING (
  owner_id = auth.uid()
  OR owner_id IN (
    SELECT subordinate_id FROM user_hierarchy WHERE manager_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM crm_users WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## Workflow

### Building the Org Chart

1. Admin goes to **Admin Dashboard → Org Chart** tab
2. Drag users to their new manager
3. Confirm the change in the dialog
4. The edge function automatically:
   - Updates `crm_users.reports_to`
   - Rebuilds the `user_hierarchy` table
5. Changes take effect immediately for RLS policies

### How Data Access Works

1. User logs in and accesses CRM data
2. RLS policy checks:
   - Is user the owner? → Allow
   - Is owner a subordinate of user? → Check user_hierarchy → Allow
   - Is user an admin? → Allow
   - Otherwise → Deny
3. Query returns only authorized records

## Step 4: OpportunitiesScreen Integration

### Overview

The OpportunitiesScreen includes a **Hierarchy View Filter** that allows users to toggle between:
- **My Deals**: Shows only opportunities owned by the current user
- **Team Deals**: Shows opportunities owned by the user AND their subordinates (based on org hierarchy)

### Implementation Details

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpportunitiesScreen.tsx                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Hierarchy View Toggle                                   │    │
│  │  ┌──────────────┐  ┌──────────────┐                     │    │
│  │  │  My Deals    │  │  Team Deals  │                     │    │
│  │  │  (12)        │  │  (47)        │                     │    │
│  │  └──────────────┘  └──────────────┘                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  On Mount: Fetch subordinates from user_hierarchy       │    │
│  │                                                          │    │
│  │  SELECT subordinate_id                                   │    │
│  │  FROM user_hierarchy                                     │    │
│  │  WHERE manager_id = current_user_id                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Filter Logic:                                           │    │
│  │                                                          │    │
│  │  if (hierarchyView === 'mine') {                         │    │
│  │    return opp.ownerId === currentUserId                  │    │
│  │  } else { // 'team'                                      │    │
│  │    return opp.ownerId === currentUserId                  │    │
│  │        || subordinateIds.includes(opp.ownerId)           │    │
│  │  }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Toggle Buttons with Counts**
   - Shows real-time count of deals in each view
   - Visual indicator of which view is active

2. **Subordinate Fetching**
   - On component mount, fetches all subordinate IDs from `user_hierarchy` table
   - Uses the same hierarchy data populated by the org-hierarchy edge function

3. **Info Banners**
   - Shows number of subordinates when in Team view
   - Prompts user to contact admin if no subordinates found

4. **Owner Badges**
   - In Team view, shows owner name badge on deals not owned by current user
   - Helps distinguish between own deals and subordinate deals

5. **Detail Modal Enhancement**
   - Shows "Owned by [Name]" banner when viewing a subordinate's deal
   - Indicates "You're viewing this deal as their manager"

### Data Flow

```
1. User opens Opportunities screen
   │
   ├─► useEffect fetches subordinates from user_hierarchy
   │   │
   │   └─► SELECT subordinate_id FROM user_hierarchy WHERE manager_id = user.id
   │
2. User toggles between "My Deals" and "Team Deals"
   │
   ├─► "My Deals": Filter where ownerId === user.id
   │
   └─► "Team Deals": Filter where ownerId === user.id OR ownerId IN subordinateIds
```

### Why Client-Side Filtering Works

The OpportunitiesScreen uses **client-side filtering** which is safe because:

1. **RLS Already Applied**: The database only returns records the user is authorized to see
2. **user_hierarchy Is Authoritative**: The subordinate list comes from the same table RLS uses
3. **No Security Bypass**: Client filtering is for UX convenience, not security

In other words:
- "My Deals" = Subset of what RLS allows
- "Team Deals" = Everything RLS allows

## Integration Summary

| Component | Role | Modifies Hierarchy? |
|-----------|------|---------------------|
| **OrgChart.tsx** | Visual drag-and-drop hierarchy editor | YES (via edge function) |
| **UserManagement.tsx** | User role and status management | NO (read-only view) |
| **org-hierarchy** | Edge function for all hierarchy operations | YES (database updates) |
| **OpportunitiesScreen.tsx** | Consumes hierarchy for view filtering | NO (read-only) |

## Best Practices

1. **Use OrgChart for Hierarchy Changes**: Never update `reports_to` directly in the database
2. **Avoid Deep Hierarchies**: Very deep hierarchies (>10 levels) may impact performance
3. **Regular Audits**: Use Activity Logs to track hierarchy changes
4. **Test RLS**: After setup, verify users can only see appropriate data

## Troubleshooting

### Users Can See Data They Shouldn't
1. Check if user_hierarchy was rebuilt after last change
2. Verify the reports_to chain is correct in OrgChart
3. Check if user has admin role

### Circular Reference Error
1. The system prevents direct circular references
2. For complex cases, manually check the reports_to chain in OrgChart

### Hierarchy Not Updating
1. Make changes via OrgChart (not direct database updates)
2. Check edge function logs for errors
3. Verify database permissions

### "No Subordinates" in Team View
1. Check OrgChart to verify reporting structure
2. Ensure user_hierarchy table was rebuilt
3. Verify the current user has direct reports assigned

## Related Files

- `src/components/admin/UserManagement.tsx` - User role/status management (read-only hierarchy view)
- `src/components/admin/OrgChart.tsx` - Visual org chart with drag-and-drop (PRIMARY hierarchy editor)
- `src/components/screens/OpportunitiesScreen.tsx` - Deals screen with My Deals/Team Deals filter
- `src/pages/Admin.tsx` - Admin dashboard with both tabs
- `supabase/functions/org-hierarchy/index.ts` - Edge function for hierarchy operations
- `docs/DATABASE_PART5_CORRECTED.sql` - Database schema with RLS policies
