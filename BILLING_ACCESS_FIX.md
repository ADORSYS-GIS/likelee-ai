# Billing Access Fix for Account Owners and Admins

## Problem Statement

Account owners and admins were receiving an "Access Denied" error when trying to access billing and subscription modification pages.

### Error Screenshot Description
- Page shows: "Access Denied"
- Message: "Oops! You don't have the required permissions to view this page. This area is restricted to authorized users only."
- Affects: Account owners and admins attempting to modify billing/subscription

## Root Cause Analysis

The issue stems from the team RBAC (Role-Based Access Control) implementation:

1. **Permission Checking Flow:**
   - Billing routes require `manage_billing` permission (`likelee-ui/src/pages/index.tsx:447,459`)
   - `ProtectedRoute` component checks permissions via `useTeamAccess` hook
   - Hook calls `/api/team/context` endpoint to fetch user permissions
   - Endpoint queries `organization_memberships` table to determine role and permissions

2. **Missing Data:**
   - The `organization_memberships` table requires explicit records for all team members
   - Owner and Admin roles have `ManageBilling` permission (`likelee-server/src/team/permissions.rs:73,86`)
   - However, if the membership record is missing from the database, the permission check fails
   - Missing records cause the API to return an error or empty permissions list

3. **Legacy Owner Pattern:**
   - The system has logic to handle "legacy owners" (where `user.id == organization.id`)
   - This creates virtual membership records at runtime
   - But the database query may fail before reaching this fallback logic

## Solution

Created migration `2026-04-06_03_ensure_owner_memberships.sql` that:

1. **Creates/Updates Agency Owner Memberships:**
   - For agencies where `agency.id = user.id` (primary owner pattern)
   - For agencies where `agency.user_id` exists and differs from `agency.id`
   - Sets role to 'owner' with 'active' status

2. **Creates/Updates Brand Owner Memberships:**
   - For brands where `brand.id = user.id` (primary owner pattern)
   - For brands where `brand.user_id` exists and differs from `brand.id`
   - Sets role to 'owner' with 'active' status

3. **Upsert Logic:**
   - Uses `ON CONFLICT ... DO UPDATE` to handle existing records
   - Updates inactive or incorrectly-roled records to active owner status
   - Preserves existing owner records that are already correct

## Implementation Steps

### 1. Apply the Migration

```bash
# Navigate to project root
cd /home/christian/adorsys/Likelee-AI

# Apply the migration via Supabase CLI
supabase db push

# Or run directly with psql
psql $DATABASE_URL -f supabase/migrations/2026-04-06_03_ensure_owner_memberships.sql
```

### 2. Verify the Fix

**Backend Verification:**
```sql
-- Check agency owner memberships
SELECT 
  organization_type,
  organization_id,
  user_id,
  email,
  role,
  status
FROM organization_memberships 
WHERE organization_type = 'agency' 
  AND role = 'owner'
ORDER BY created_at DESC
LIMIT 10;

-- Check brand owner memberships
SELECT 
  organization_type,
  organization_id,
  user_id,
  email,
  role,
  status
FROM organization_memberships 
WHERE organization_type = 'brand' 
  AND role = 'owner'
ORDER BY created_at DESC
LIMIT 10;

-- Verify owner has manage_billing permission (should return true for owners/admins)
SELECT 
  m.*,
  a.agency_name
FROM organization_memberships m
LEFT JOIN agencies a ON a.id = m.organization_id AND m.organization_type = 'agency'
WHERE m.role IN ('owner', 'admin')
LIMIT 5;
```

**Frontend Testing:**
1. Log in as an agency owner or admin
2. Navigate to `/AgencySubscribe` or `/agencysubscribe`
3. Should now access the page without "Access Denied" error
4. Verify billing controls are visible and functional

**API Endpoint Test:**
```bash
# Get auth token from browser devtools (Application > Local Storage > auth token)
export AUTH_TOKEN="your-auth-token-here"

# Test team context endpoint
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  "http://localhost:3001/api/team/context?organization_type=agency"

# Expected response should include:
# {
#   "organization_type": "agency",
#   "organization_id": "...",
#   "organization_name": "...",
#   "membership_role": "owner",
#   "permissions": ["create_campaigns", "approve_deliverables", "view_deliverables", "manage_billing", ...]
# }
```

### 3. Clear Frontend Cache (if needed)

```typescript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh the page
location.reload();
```

## Related Files Modified

- **Migration:** `supabase/migrations/2026-04-06_03_ensure_owner_memberships.sql`
- **Documentation:** `BILLING_ACCESS_FIX.md`

## Related Code References

### Backend
- Permission definitions: `likelee-server/src/team/permissions.rs:39-62`
- Owner/Admin permissions: `likelee-server/src/team/permissions.rs:69-94`
- Team context endpoint: `likelee-server/src/team/mod.rs:143-165`
- Billing permission check: `likelee-server/src/billing.rs:499` (agency), `likelee-server/src/billing.rs:972` (brand)

### Frontend
- Protected routes: `likelee-ui/src/pages/index.tsx:443-464`
- Permission checking: `likelee-ui/src/auth/ProtectedRoute.tsx:59-64`
- Team access hook: `likelee-ui/src/features/team/useTeamAccess.ts:26-109`
- Billing settings button: `likelee-ui/src/components/dashboard/settings/GeneralSettingsView.tsx:2013`

### Database
- Membership table: `supabase/migrations/2026-04-04_team_rbac_foundation.sql:3-29`
- RLS policies: `supabase/migrations/2026-04-06_01_team_member_rls_policies.sql`
- Team helper functions: `supabase/migrations/2026-04-06_01_team_member_rls_policies.sql:7-44`

## Permissions Matrix

| Role | Permissions |
|------|-------------|
| Owner | create_campaigns, approve_deliverables, view_deliverables, **manage_billing**, invite_team_members, update_member_roles, view_team_members, view_brand_connections, manage_brand_connections, disconnect_brand_connections, view_clients, manage_clients, view_licenses, manage_licenses, transfer_ownership, delete_organisation |
| Admin | create_campaigns, approve_deliverables, view_deliverables, **manage_billing**, invite_team_members, update_member_roles, view_team_members, view_brand_connections, manage_brand_connections, disconnect_brand_connections, view_clients, manage_clients, view_licenses, manage_licenses |
| Project Manager | create_campaigns, approve_deliverables, view_deliverables, view_team_members, view_brand_connections, manage_brand_connections, view_clients, manage_clients, view_licenses, manage_licenses |
| Reviewer | view_deliverables, view_team_members, view_brand_connections, view_clients, view_licenses |

## Troubleshooting

### Issue: Still getting "Access Denied" after migration

**Possible Causes:**
1. Migration not applied correctly
2. Frontend cache not cleared
3. User session is stale

**Solutions:**
```bash
# 1. Verify migration was applied
psql $DATABASE_URL -c "SELECT * FROM organization_memberships WHERE user_id = 'your-user-id';"

# 2. Check user's current role in profile
psql $DATABASE_URL -c "SELECT id, email, role FROM profiles WHERE id = 'your-user-id';"

# 3. Restart backend server
# Ctrl+C and restart: cargo run

# 4. Clear browser data and re-login
```

### Issue: API returns empty permissions array

**Diagnosis:**
```bash
# Check if membership record exists
psql $DATABASE_URL -c "
SELECT * FROM organization_memberships 
WHERE organization_type = 'agency' 
  AND user_id = 'your-user-id';
"

# Should return at least one row with role = 'owner'
```

**Fix:**
```sql
-- Manually create membership if missing
INSERT INTO organization_memberships (
  organization_type, organization_id, user_id, email, role, status
) VALUES (
  'agency', 'your-agency-id', 'your-user-id', 'your-email', 'owner', 'active'
) ON CONFLICT (organization_type, organization_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active', updated_at = now();
```

### Issue: RLS policy blocking queries

**Diagnosis:**
The RLS policy on `organization_memberships` should allow users to view their own memberships:
```sql
-- Check current policy
SELECT * FROM pg_policies WHERE tablename = 'organization_memberships';
```

**Expected Policy:**
```sql
CREATE POLICY "Users can view own organization memberships"
  ON organization_memberships FOR SELECT
  USING (auth.uid() = user_id);
```

## Testing Checklist

- [ ] Migration applied successfully without errors
- [ ] Owner membership records exist for all agencies
- [ ] Owner membership records exist for all brands
- [ ] Team context API returns correct permissions for owners
- [ ] Team context API returns correct permissions for admins
- [ ] Billing page accessible for agency owners
- [ ] Billing page accessible for brand owners
- [ ] Billing page accessible for agency admins
- [ ] Billing page accessible for brand admins
- [ ] Project managers still cannot access billing (should get Access Denied)
- [ ] Reviewers still cannot access billing (should get Access Denied)

## Success Criteria

✅ Account owners can access `/AgencySubscribe` without "Access Denied" error  
✅ Account admins can access `/AgencySubscribe` without "Access Denied" error  
✅ Team context API returns `manage_billing` in permissions array for owners/admins  
✅ Billing modification controls are visible and functional  
✅ Lower-privilege roles (project_manager, reviewer) still cannot access billing pages

## Additional Notes

- This fix is backward-compatible with existing team member access
- The migration uses upsert logic to avoid duplicate records
- Legacy owner detection logic in the backend remains as a fallback
- Frontend permission checking relies on backend API responses
- Team context is cached for 5 minutes (configurable in `likelee-server/src/team/mod.rs:23`)

## Future Improvements

1. **Auto-create memberships on signup:** When agencies/brands are created, automatically create an owner membership record
2. **Migration on user role changes:** When a user's role changes in profiles table, sync to organization_memberships
3. **Health check endpoint:** Add an endpoint to verify membership integrity: `/api/team/health`
4. **Better error messages:** Show specific permission names in "Access Denied" page
5. **Permission debugging tool:** Add a dev-mode panel showing current permissions and why they were granted/denied
