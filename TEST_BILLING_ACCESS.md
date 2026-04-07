# Billing Access Diagnostic Test

## Problem
You're logged in as owner (confirmed), but getting "Access Denied" when accessing billing pages.

## Your Login Details (from browser console)
- User ID: `6eeb46ec-738b-45fe-a56f-51cc84eed00f` ✓
- Email: `christian.defometio@adorsys.com` ✓
- Role: `agency` ✓

## Database Membership (confirmed)
Your membership exists with:
- Role: `owner` ✓
- Status: `active` ✓

## The Protection Logic
The billing page requires `manage_billing` permission, which is checked by:
1. `ProtectedRoute` component calls `useTeamAccess("agency")`
2. `useTeamAccess` fetches `/api/team/context?organization_type=agency`
3. Backend should return permissions including `manage_billing`
4. If permission is missing, you get redirected to `/Unauthorized`

## Diagnostic Steps

### Step 1: Check API Response
Open your browser console (F12) and run:

```javascript
fetch('/api/team/context?organization_type=agency', {
  headers: {
    Authorization: `Bearer ${JSON.parse(localStorage.getItem('supabase.auth.token')).access_token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Team Context Response:', data);
  console.log('Permissions:', data.permissions);
  console.log('Has manage_billing?', data.permissions?.includes('manage_billing'));
})
.catch(err => console.error('Error:', err));
```

**Expected Output:**
```json
{
  "organization_type": "agency",
  "organization_id": "6eeb46ec-738b-45fe-a56f-51cc84eed00f",
  "organization_name": "...",
  "membership_role": "owner",
  "permissions": [
    "create_campaigns",
    "approve_deliverables",
    "view_deliverables",
    "manage_billing",  ← Should be here!
    "invite_team_members",
    "update_member_roles",
    "view_team_members",
    "view_brand_connections",
    "manage_brand_connections",
    "view_licenses",
    "manage_licenses",
    "transfer_ownership",
    "delete_organisation"
  ],
  "members": [...],
  "invites": [...]
}
```

### Step 2: Check Backend Logs
If the API fails or returns wrong data, check your backend server logs for errors.

Look for:
```
Permission denied
No active organization membership found
Failed to load team context
```

### Step 3: Possible Issues

#### Issue A: API Returns Error
If you get an error like "No active organization membership found":
- The backend can't find your membership
- Clear backend cache by restarting server
- Check if migration was applied correctly

#### Issue B: API Returns Empty/Wrong Permissions
If permissions array is empty or doesn't include `manage_billing`:
- Backend is returning wrong role
- Database has stale data
- Cache issue

#### Issue C: API Call Fails Completely
If you get network error or 500:
- Check backend server is running
- Check authentication token is valid
- Check backend logs for errors

### Step 4: Quick Fixes

#### Fix A: Clear All Caches
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```
Then log in again.

#### Fix B: Restart Backend Server
```bash
cd likelee-server
cargo run
```

#### Fix C: Force Refresh Membership
Run this SQL to update the membership timestamp (forces cache invalidation):
```sql
UPDATE public.organization_memberships
SET updated_at = now()
WHERE organization_id = '6eeb46ec-738b-45fe-a56f-51cc84eed00f'
  AND user_id = '6eeb46ec-738b-45fe-a56f-51cc84eed00f';
```

Then log out and log back in.

## Files Created for Reference
- `ProtectedRoute.tsx` (line 59-64) - Permission check logic
- `useTeamAccess.ts` (line 97-101) - hasPermission function
- `likelee-server/src/team/mod.rs` (line 673-765) - Backend permission logic
- `likelee-server/src/team/permissions.rs` (line 71-117) - Permission definitions

## What to Report Back
After running the diagnostic in Step 1, please share:
1. The full output from the API call
2. Any errors in browser console
3. Any errors in backend server logs
