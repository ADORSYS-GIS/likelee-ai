# Project Manager Deliverable Approval - Verification

## Current Status ✅

**Project Managers ALREADY have `ApproveDeliverables` permission**

### Permission Definition
File: `likelee-server/src/team/permissions.rs` (lines 101-108)

```rust
TeamRole::ProjectManager => vec![
    Permission::CreateCampaigns,
    Permission::ApproveDeliverables,  // ✅ Already granted!
    Permission::ViewDeliverables,
    Permission::ViewTeamMembers,
    Permission::ViewBrandConnections,
    Permission::ViewLicenses,
],
```

### Where It's Checked

1. **Booking Deliverables** (`booking_deliverables.rs:173`)
```rust
let agency_access = team::require_agency_permission(
    state, user, Permission::ApproveDeliverables
).await?;
```

2. **Brand Campaign Deliverables** (`brand_campaigns.rs:6693`)
```rust
team::require_agency_permission(&state, &user, Permission::ApproveDeliverables).await?
```

## How It Works

When a Project Manager tries to approve a deliverable:
1. Backend checks: `require_agency_permission(user, ApproveDeliverables)`
2. Permission check passes (PM has the permission)
3. Deliverable approval succeeds

## Test It

Run this in browser console while logged in as a Project Manager:

```javascript
// Check if PM can approve deliverables
fetch('/api/team/context?organization_type=agency', {
  headers: { 
    Authorization: `Bearer ${JSON.parse(localStorage.getItem('sb-himyrgwyrsmltmzlbuxm-auth-token')).access_token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Role:', data.membership_role);
  console.log('Has approve_deliverables permission:', 
    data.permissions.includes('approve_deliverables'));
  console.log('All permissions:', data.permissions);
});
```

Expected output:
- Role: `project_manager`
- Has approve_deliverables permission: `true`
- Permissions includes: `approve_deliverables`

## If It's Not Working

If a Project Manager is getting "Access Denied" when approving deliverables:

1. **Check the user's actual role:**
```sql
SELECT role FROM organization_memberships 
WHERE user_id = 'PROJECT_MANAGER_USER_ID';
```

2. **Check if the permission is being returned:**
```sql
-- Should return true for project_manager role
SELECT 'approve_deliverables' IN (
    SELECT unnest(ARRAY[
        'create_campaigns',
        'approve_deliverables',
        'view_deliverables',
        'view_team_members',
        'view_brand_connections',
        'view_licenses'
    ])
);
```

3. **Check backend logs** for permission errors

## Permission Matrix

| Role | Approve Deliverables | View Deliverables |
|------|---------------------|-------------------|
| Owner | ✅ | ✅ |
| Admin | ✅ | ✅ |
| Project Manager | ✅ | ✅ |
| Reviewer | ✅ | ✅ |

**Note:** Even Reviewers can approve deliverables!

## Additional Checks Needed?

If you want to add MORE restrictions (e.g., only PM+ can approve, not Reviewers):

```rust
// In permissions.rs
TeamRole::Reviewer => vec![
    // Permission::ApproveDeliverables,  // Remove this
    Permission::ViewDeliverables,
    Permission::ViewTeamMembers,
    Permission::ViewBrandConnections,
    Permission::ViewLicenses,
],
```

But currently, **Project Managers already have the permission** and should be able to approve deliverables without any code changes.

## Files Involved

- `likelee-server/src/team/permissions.rs` - Permission definitions
- `likelee-server/src/booking_deliverables.rs` - Deliverable approval endpoint
- `likelee-server/src/brand_campaigns.rs` - Campaign deliverable approval
- `likelee-ui/src/auth/ProtectedRoute.tsx` - Frontend permission checks
