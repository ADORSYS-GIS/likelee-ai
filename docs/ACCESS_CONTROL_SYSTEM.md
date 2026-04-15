# Access Control System Documentation

## Overview

The Likelee platform implements a comprehensive role-based access control (RBAC) system that applies to both **Brands** and **Agencies**. This unified permission system ensures consistent security and user experience across all organization types while respecting the context-specific needs of each.

## Architecture

### Permission System Design

The permission system is **shared** between brands and agencies, with context-aware interpretation:

```
┌─────────────────────────────────────────────────────────────┐
│                    Permission System                         │
│                  (Unified for All Orgs)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │    Brands    │         │   Agencies   │                 │
│  ├──────────────┤         ├──────────────┤                 │
│  │ Creators     │         │ Talents      │                 │
│  │ Campaigns    │         │ Campaigns    │                 │
│  │ Licenses     │         │ Licenses    │                 │
│  │ Connections  │         │ Connections │                 │
│  └──────────────┘         └──────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Role Hierarchy

```
Owner (Highest)
  ↓
Admin
  ↓
Project Manager
  ↓
Reviewer (Lowest - Read-Only)
```

---

## Roles and Permissions

### Role Definitions

#### **Owner**
- **Access Level**: Complete organization control
- **Key Capabilities**: 
  - All permissions (full access)
  - Transfer ownership to another member
  - Delete the organization
  - Manage billing and subscriptions
  - Invite and manage team members
- **Typical Users**: Organization founder, primary account holder
- **Count**: Exactly 1 per organization

#### **Admin**
- **Access Level**: Full management access
- **Key Capabilities**:
  - All operational permissions
  - Manage billing and subscriptions
  - Invite team members
  - Update member roles
  - Manage all resources
- **Cannot Do**:
  - Transfer ownership
  - Delete organization
- **Typical Users**: Operations manager, business administrator
- **Count**: Multiple allowed

#### **Project Manager**
- **Access Level**: Operational management
- **Key Capabilities**:
  - Create and manage campaigns
  - Approve deliverables
  - Pay offers
  - Manage jobs, contracts, licenses
  - Manage brand connections and clients
  - View subscriptions (read-only)
- **Cannot Do**:
  - Manage billing/subscriptions (upgrade plans)
  - Invite team members
  - Update member roles
- **Typical Users**: Campaign managers, project leads
- **Count**: Multiple allowed

#### **Reviewer**
- **Access Level**: Read-only access
- **Key Capabilities**:
  - View all resources (deliverables, team, connections, clients, licenses, jobs, contracts, pay offers)
- **Cannot Do**:
  - Create, edit, approve, or manage anything
  - View billing/subscription details
  - Invite team members or update roles
- **Typical Users**: Stakeholders, auditors, observers
- **Count**: Multiple allowed

---

## Complete Permission Matrix

### All Permissions by Role

| Permission | Owner | Admin | Project Manager | Reviewer |
|------------|:-----:|:-----:|:---------------:|:--------:|
| **Campaign Management** |||||
| CreateCampaigns | ✅ | ✅ | ✅ | ❌ |
| **Deliverable Management** |||||
| ApproveDeliverables | ✅ | ✅ | ✅ | ❌ |
| ViewDeliverables | ✅ | ✅ | ✅ | ✅ |
| **Billing & Subscriptions** |||||
| ManageBilling | ✅ | ✅ | ❌ | ❌ |
| ManageSubscriptions | ✅ | ✅ | ❌ | ❌ |
| ViewSubscriptions | ✅ | ✅ | ✅ | ❌ |
| **Team Management** |||||
| InviteTeamMembers | ✅ | ✅ | ❌ | ❌ |
| UpdateMemberRoles | ✅ | ✅ | ❌ | ❌ |
| ViewTeamMembers | ✅ | ✅ | ✅ | ✅ |
| **Brand Connections** |||||
| ViewBrandConnections | ✅ | ✅ | ✅ | ✅ |
| ManageBrandConnections | ✅ | ✅ | ✅ | ❌ |
| DisconnectBrandConnections | ✅ | ✅ | ✅ | ❌ |
| **Client Management** |||||
| ViewClients | ✅ | ✅ | ✅ | ✅ |
| ManageClients | ✅ | ✅ | ✅ | ❌ |
| **License Management** |||||
| ViewLicenses | ✅ | ✅ | ✅ | ✅ |
| ManageLicenses | ✅ | ✅ | ✅ | ❌ |
| **Job Management** |||||
| ManageJobs | ✅ | ✅ | ✅ | ❌ |
| ViewJobs | ✅ | ✅ | ✅ | ✅ |
| **Contract Management** |||||
| ManageContracts | ✅ | ✅ | ✅ | ❌ |
| ViewContracts | ✅ | ✅ | ✅ | ✅ |
| **Payment Management** |||||
| ManagePayOffers | ✅ | ✅ | ✅ | ❌ |
| ViewPayOffers | ✅ | ✅ | ✅ | ✅ |
| **Organization Control** |||||
| TransferOwnership | ✅ | ❌ | ❌ | ❌ |
| DeleteOrganisation | ✅ | ❌ | ❌ | ❌ |

---

## Context-Specific Permission Meanings

### Brand Context

| Permission | Brand Interpretation |
|------------|---------------------|
| ViewBrandConnections | View creator relationships and partnerships |
| ManageBrandConnections | Manage creator relationships, send connection requests |
| DisconnectBrandConnections | Disconnect from creators |
| ManageClients | Manage brand's customers/end users |
| ManageLicenses | Manage licensing requests from creators |
| ManagePayOffers | Pay creator offers for campaigns |

### Agency Context

| Permission | Agency Interpretation |
|------------|----------------------|
| ViewBrandConnections | View brand partnerships and collaborations |
| ManageBrandConnections | Manage brand relationships, accept/decline partnerships |
| DisconnectBrandConnections | Disconnect from brands |
| ManageClients | Manage agency's clients (which are brands) |
| ManageLicenses | Manage licensing for represented talents |
| ManagePayOffers | Pay talent offers for campaigns |

---

## Permission Categories

### 1. **View Permissions** (Read-Only Access)

Available to **Reviewer** role and above:
- `ViewDeliverables` - View campaign deliverables
- `ViewTeamMembers` - View team member list
- `ViewBrandConnections` - View organization connections
- `ViewClients` - View client list
- `ViewLicenses` - View licensing requests
- `ViewJobs` - View job postings
- `ViewContracts` - View contracts
- `ViewPayOffers` - View payment offers
- `ViewSubscriptions` - View subscription/billing info (PM+ only)

### 2. **Manage Permissions** (Operational Access)

Available to **Project Manager** role and above:
- `CreateCampaigns` - Create and edit campaigns
- `ApproveDeliverables` - Approve/reject deliverables
- `ManageBrandConnections` - Manage connections
- `DisconnectBrandConnections` - Disconnect from partners
- `ManageClients` - Manage client relationships
- `ManageLicenses` - Manage licensing requests
- `ManageJobs` - Create and manage job postings
- `ManageContracts` - Create and manage contracts
- `ManagePayOffers` - Process payments for offers

### 3. **Administrative Permissions**

Available to **Admin** role and above:
- `ManageBilling` - Manage billing and payment methods
- `ManageSubscriptions` - Upgrade/downgrade plans
- `InviteTeamMembers` - Invite new team members
- `UpdateMemberRoles` - Change member roles

### 4. **Ownership Permissions**

Available to **Owner** only:
- `TransferOwnership` - Transfer ownership to another member
- `DeleteOrganisation` - Permanently delete the organization

---

## Implementation

### Backend (Rust)

#### Permission Definition
File: `likelee-server/src/team/permissions.rs`

```rust
pub enum Permission {
    CreateCampaigns,
    ApproveDeliverables,
    ViewDeliverables,
    ManageBilling,
    InviteTeamMembers,
    UpdateMemberRoles,
    ViewTeamMembers,
    ViewBrandConnections,
    ManageBrandConnections,
    DisconnectBrandConnections,
    ViewClients,
    ManageClients,
    ViewLicenses,
    ManageLicenses,
    TransferOwnership,
    DeleteOrganisation,
    ManageJobs,
    ViewJobs,
    ManageContracts,
    ViewContracts,
    ManageSubscriptions,
    ViewSubscriptions,
    ManagePayOffers,
    ViewPayOffers,
}

pub fn permissions_for_role(role: TeamRole) -> Vec<Permission> {
    match role {
        TeamRole::Owner => vec![/* all permissions */],
        TeamRole::Admin => vec![/* all except TransferOwnership, DeleteOrganisation */],
        TeamRole::ProjectManager => vec![/* operational permissions, no billing/team management */],
        TeamRole::Reviewer => vec![/* view permissions only, no ViewSubscriptions */],
    }
}
```

#### Permission Checking
File: `likelee-server/src/team/access.rs`

```rust
pub async fn require_brand_permission(
    state: &AppState,
    user: &AuthUser,
    permission: Permission,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    require_organization_permission(state, user, OrganizationType::Brand, permission).await
}

pub async fn require_agency_permission(
    state: &AppState,
    user: &AuthUser,
    permission: Permission,
) -> Result<OrganizationAccess, (StatusCode, String)> {
    require_organization_permission(state, user, OrganizationType::Agency, permission).await
}
```

#### Usage in Endpoints

```rust
pub async fn approve_deliverable(
    State(state): State<AppState>,
    user: AuthUser,
    Path(deliverable_id): Path<String>,
) -> Result<Json<Deliverable>, (StatusCode, String)> {
    // Check permission
    let _access = team::require_brand_permission(&state, &user, Permission::ApproveDeliverables).await?;
    
    // Proceed with approval logic
    // ...
}
```

### Frontend (TypeScript/React)

#### Permission Hook
File: `likelee-ui/src/features/team/useTeamAccess.ts`

```typescript
export function useTeamAccess(organizationType?: "agency" | "brand") {
  const { profile } = useAuth();
  const [context, setContext] = useState<TeamAccessContext | null>(null);
  
  const hasPermission = useCallback(
    (permission: string) => Boolean(context?.permissions?.includes(permission)),
    [context?.permissions]
  );
  
  return { hasPermission, context, loading, error };
}
```

#### Usage in Components

```typescript
import { useTeamAccess } from "@/features/team/useTeamAccess";

function DeliverableApprovalButton({ deliverableId }: { deliverableId: string }) {
  const { hasPermission } = useTeamAccess("brand");
  const canApprove = hasPermission("approve_deliverables");
  
  if (!canApprove) {
    return null;
  }
  
  return (
    <Button onClick={() => approveDeliverable(deliverableId)}>
      Approve
    </Button>
  );
}
```

#### UI Permission Gates

```typescript
// Hide billing section from reviewers
const canViewSubscriptions = hasPermission("view_subscriptions");

{canViewSubscriptions && (
  <TabsContent value="billing">
    <BillingSection />
  </TabsContent>
)}

// Show upgrade button only to billing managers
const canManageBilling = hasPermission("manage_billing");

{canManageBilling && (
  <Button onClick={() => navigate("/brandpricing")}>
    Upgrade Plan
  </Button>
)}
```

---

## Security Best Practices

### 1. **Least Privilege Principle**
- Users should have the minimum permissions necessary for their role
- Reviewers cannot approve, edit, or manage anything
- Project Managers cannot manage billing or team members

### 2. **Defense in Depth**
- Backend enforces permissions via `require_*_permission()` functions
- Frontend gates UI elements based on permissions
- Database RLS policies provide additional layer of security

### 3. **Audit Logging**
All team management actions are logged:
- Role changes
- Team invitations
- Permission-related actions

### 4. **Cache Consistency**
- Permissions are cached for performance
- Cache is invalidated on role changes
- TTL ensures eventual consistency
- **See**: [Cache Invalidation System](./CACHE_INVALIDATION.md) for detailed documentation

---

## Common Patterns

### Checking Multiple Permissions

```typescript
const canManage = hasPermission("manage_jobs") && hasPermission("manage_contracts");
const canView = hasPermission("view_jobs") || hasPermission("view_contracts");
```

### Role-Based UI Rendering

```typescript
const role = context?.membership_role;

switch (role) {
  case "owner":
  case "admin":
    // Show all features
    break;
  case "project_manager":
    // Hide billing and team management
    break;
  case "reviewer":
    // Show read-only view
    break;
}
```

### Conditional Navigation

```typescript
const navigationItems = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: Target },
  ...(canViewSubscriptions ? [{ id: "billing", label: "Billing", icon: CreditCard }] : []),
];
```

---

## Testing Permissions

### Backend Tests

```bash
cd likelee-server
cargo test --lib team::permissions
cargo test --lib team::preservation_tests
```

### Manual Testing

```javascript
// Check current user's permissions
fetch('/api/team/context?organization_type=brand', {
  headers: { 
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Role:', data.membership_role);
  console.log('Permissions:', data.permissions);
});
```

---

## Related Documentation

- [Team Member Functionality](./team-member-functionality.md) - Detailed team management documentation
- [PM Approve Deliverables](./PM_APPROVE_DELIVERABLES.md) - Project Manager permission verification

---

## Subscription Plan Limits

### Agency Team Seat Limits

Agency team seat limits define the maximum number of internal team members (Owner, Admin, Project Manager, Reviewer) that can be invited to an agency organization.

| Plan Tier | Team Seat Limit |
|-----------|-----------------|
| Free      | 1               |
| Basic     | 5               |
| Pro       | 5               |
| Enterprise| 5               |

**Note:** Team seats are separate from roster seats (talent/models). Roster seats are purchased separately and have different pricing tiers.

### Implementation

- **Backend**: `likelee-server/src/entitlements.rs` - `get_seat_limit_info()` function
- **Backend**: `likelee-server/src/agency_roster.rs` - Seat limit validation for roster operations

---

## Change History

### 2026-04-15
- **Updated**: Agency team seat limits changed from 186 to 5 for Basic/Pro/Enterprise plans
- **Added**: Subscription plan limits documentation section

### 2026-04-14
- **Added**: `ManageLicenses` permission to Project Manager role
- **Added**: `DisconnectBrandConnections` permission to Project Manager role
- **Removed**: `ViewSubscriptions` permission from Reviewer role
- **Removed**: `ApproveDeliverables` permission from Reviewer role (now truly read-only)
- **Updated**: Permission matrix to reflect current implementation
- **Created**: Comprehensive access control documentation
