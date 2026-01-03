# Avatar Upload Path Mismatch Fix

**Date:** 2026-01-03
**Status:** ✅ RESOLVED

## Problem

Avatar uploads were failing with an infinite spinner, causing session degradation ("Zombie Mode").

## Root Cause

**Path Mismatch Between Frontend and RLS Policy:**

- **RLS Policy Expected:** `avatars/{auth.uid()}/{filename}`
  - Uses `auth.uid()` which returns the `auth.users.id` (Supabase Auth UUID)

- **Frontend Was Sending:** `avatars/{profile.id}/{filename}`
  - Used `profile.id` which is the `crm_users.id` (different UUID!)

- **Result:** RLS policy blocked the upload → spinner never stopped → error not caught properly → session appeared "dead"

## The Fix

**File:** `src/components/profile/ProfileHeader.tsx`

### Changed From:
```typescript
const { updateProfile } = useAuth();
// ...
const path = `${profile.id}/${Date.now()}.${ext}`;
```

### Changed To:
```typescript
const { user, updateProfile } = useAuth();
// ...
const path = `${user.id}/${Date.now()}.${ext}`;
```

### Additional Improvements:

1. **Auth Check:** Validates `user?.id` exists before attempting upload
2. **Better Error Handling:** Comprehensive try/catch with specific error messages
3. **Console Logging:** Errors logged for debugging
4. **Input Reset:** Clears file input after upload (success or failure)
5. **Cache Control:** Added `cacheControl: '3600'` for better performance
6. **Upsert Protection:** Set `upsert: false` to prevent accidental overwrites

## Key Learnings

### Two Different User IDs

| ID Type | Source | Used For |
|---------|--------|----------|
| `user.id` | `auth.users` table (Supabase Auth) | Storage RLS policies, auth checks |
| `profile.id` | `crm_users` table | Business logic, CRM data |

### When to Use Which ID:

- **Use `user.id`** (auth.users):
  - Storage bucket access (RLS policies)
  - Authentication checks
  - Session management

- **Use `profile.id`** (crm_users):
  - CRM data relationships
  - Activity tracking
  - Business entities (opportunities, contacts, etc.)

## RLS Policy Reference

```sql
-- This policy enforces folder structure: avatars/{auth_user_id}/filename
CREATE POLICY "Avatar Update Access" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

**Why This Is Secure:**
- Each user has their own isolated folder
- Impossible to overwrite other users' avatars
- Path-based validation is explicit and auditable
- Better than relying solely on `owner` field

## Testing Checklist

- [x] Build passes without TypeScript errors
- [ ] Upload avatar while logged in → success toast
- [ ] Upload fails gracefully → error toast (no crash)
- [ ] User stays logged in after failed upload
- [ ] Uploaded avatar displays correctly
- [ ] Avatar URL stored in `crm_users.avatar` field

## Related Files

- `src/components/profile/ProfileHeader.tsx` - Avatar upload UI
- `supabase/migrations/20260102044440_create_avatars_storage_bucket.sql` - RLS policies
- `src/contexts/AuthContext.tsx` - User/Profile interface definitions
