# Contacts Table Foreign Key Fix

## Problem
The Contacts Screen filter UI was implemented but contact data fetching was failing silently due to missing foreign key constraints in the database schema.

### Root Cause
The `contacts` table had `account_id`, `partner_id`, and `owner_id` columns but **no foreign key constraints** defined in the database. This caused Supabase PostgREST to fail when trying to perform relational queries.

Error encountered:
```
Could not find a relationship between 'contacts' and 'accounts' in the schema cache
```

## Solution

### 1. Added Missing Foreign Key Constraints
Created migration: `add_contacts_foreign_keys.sql`

Added three foreign key constraints:
- `contacts.account_id` → `accounts.id`
- `contacts.partner_id` → `partners_legacy.id` (legacy)
- `contacts.owner_id` → `crm_users.id`

All constraints use `ON DELETE SET NULL` to preserve data integrity.

### 2. Added Performance Indexes
Created indexes on the foreign key columns:
- `idx_contacts_account_id`
- `idx_contacts_partner_id`
- `idx_contacts_owner_id`

### 3. Updated Query with Explicit FK Hints
Modified `src/lib/api/contacts.ts` to use explicit foreign key hints:

```typescript
// Before (would fail)
.select(`
  *,
  account:accounts!inner(...)
`)

// After (works correctly)
.select(`
  *,
  account:accounts!contacts_account_id_fkey(
    id,
    name,
    type,
    owner_id,
    opportunities!opportunities_account_id_fkey(...)
  )
`)
```

## Database Statistics
- Total contacts: **91**
- Contacts with accounts: **25**
- Contacts with partners (legacy): **0**

## Files Modified
1. `supabase/migrations/add_contacts_foreign_keys.sql` - New migration
2. `src/lib/api/contacts.ts` - Updated fetch query with FK hints
3. `src/types/crm.ts` - Added `ownerId` to account type
4. `src/components/screens/ContactsScreen.tsx` - Tesla-style filter UI

## Testing
The fix was validated by:
1. ✅ Migration applied successfully
2. ✅ Foreign key queries execute without errors
3. ✅ Build completes successfully
4. ✅ Contacts can now be filtered by account ownership and deal stages

## Pattern for Future Reference
When joining tables in Supabase queries, always use explicit foreign key hints:

```typescript
.select('*, related_table!table_fk_name(columns)')
```

This prevents ambiguity when multiple foreign keys exist between tables.
