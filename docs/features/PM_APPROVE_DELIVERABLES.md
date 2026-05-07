# Project Manager Deliverable Approval - Verification

## Current Status ✅

**Project Managers have `ApproveDeliverables` permission**

### Permission Definition

File: `likelee-server/src/team/permissions.rs`

```rust
TeamRole::ProjectManager => vec![
    Permission::CreateCampaigns,
    Permission::ApproveDeliverables,  // ✅ Granted
    Permission::ViewDeliverables,
    Permission::ViewTeamMembers,
    Permission::ViewBrandConnections,
    Permission::ManageBrandConnections,
    Permission::DisconnectBrandConnections,
    Permission::ViewClients,
    Permission::ManageClients,
    Permission::ViewLicenses,
    Permission::ManageLicenses,
    Permission::ManageJobs,
    Permission::ViewJobs,
    Permission::ManageContracts,
    Permission::ViewContracts,
    Permission::ViewSubscriptions,
    Permission::ManagePayOffers,
    Permission::ViewPayOffers,
],
```

### Where It's Checked

1. **Booking Deliverables** (`booking_deliverables.rs`)

```rust
let agency_access = team::require_agency_permission(
    state, user, Permission::ApproveDeliverables
).await?;
```

2. **Brand Campaign Deliverables** (`brand_campaigns.rs`)

```rust
team::require_brand_permission(&state, &user, Permission::ApproveDeliverables).await?
```

## How It Works

When a Project Manager tries to approve a deliverable:

1. Backend checks: `require_brand_permission(user, ApproveDeliverables)` or `require_agency_permission(user, ApproveDeliverables)`
2. Permission check passes (PM has the permission)
3. Deliverable approval succeeds

## Permission Matrix (Current)

| Role            | Approve Deliverables | View Deliverables |
| --------------- | -------------------- | ----------------- |
| Owner           | ✅                   | ✅                |
| Admin           | ✅                   | ✅                |
| Project Manager | ✅                   | ✅                |
| Reviewer        | ❌                   | ✅                |

**Note:** Reviewers have **read-only access** and cannot approve deliverables.

## Key Differences from Previous Version

### What Changed:

- **Reviewers can NO LONGER approve deliverables** (removed for security)
- **Project Managers can now:**
  - Manage licenses
  - Manage brand connections
  - Disconnect brand connections
  - Manage clients
  - View subscriptions (read-only)
  - Pay offers

### Why These Changes:

1. **Reviewer Role Clarification**: Reviewers should have truly read-only access with no write permissions
2. **Project Manager Empowerment**: PMs need operational capabilities to manage campaigns, connections, and licenses without billing access
3. **Security Principle**: Least privilege access - roles have only the permissions they need

## Test It

Run this in browser console while logged in as a Project Manager:

```javascript
// Check if PM can approve deliverables
fetch("/api/team/context?organization_type=brand", {
  headers: {
    Authorization: `Bearer ${JSON.parse(localStorage.getItem("sb-himyrgwyrsmltmzlbuxm-auth-token")).access_token}`,
  },
})
  .then((r) => r.json())
  .then((data) => {
    console.log("Role:", data.membership_role);
    console.log(
      "Has approve_deliverables permission:",
      data.permissions.includes("approve_deliverables"),
    );
    console.log("All permissions:", data.permissions);
  });
```

Expected output:

- Role: `project_manager`
- Has approve_deliverables permission: `true`
- Permissions should include: `approve_deliverables`, `manage_licenses`, `manage_brand_connections`, etc.

## Frontend Implementation

The frontend should check permissions before showing approve buttons:

```typescript
const canApproveDeliverables = hasPermission("approve_deliverables");

{canApproveDeliverables && (
  <Button onClick={handleApprove}>Approve Deliverable</Button>
)}
```

## If It's Not Working

If a Project Manager is getting "Access Denied" when approving deliverables:

1. **Check the user's actual role:**

```sql
SELECT role FROM organization_memberships
WHERE user_id = 'PROJECT_MANAGER_USER_ID';
```

2. **Check backend logs** for permission errors

3. **Verify the permission is returned:**

```javascript
// Check browser console
console.log("Permissions:", permissions);
```

## Files Involved

- `likelee-server/src/team/permissions.rs` - Permission definitions
- `likelee-server/src/team/access.rs` - Permission checking logic
- `likelee-server/src/booking_deliverables.rs` - Deliverable approval endpoint
- `likelee-server/src/brand_campaigns.rs` - Campaign deliverable approval
- `likelee-ui/src/features/team/useTeamAccess.ts` - Frontend permission hook
- `likelee-ui/src/pages/BrandDashboard.tsx` - Frontend permission checks
