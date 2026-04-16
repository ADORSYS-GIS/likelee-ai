# Team Member Functionality

## Overview

The Team Member functionality allows organization owners (agencies or brands) to invite users to join their organization with restricted permissions. Team members share the same account data as the organization owner, including subscriptions, plan tiers, settings, and profile data, but with role-based access control (RBAC) limiting what actions they can perform.

## Architecture

### Database Schema

```
┌──────────────────────┐         ┌──────────────────────────┐
│   auth.users         │         │  organization_memberships │
├──────────────────────┤         ├──────────────────────────┤
│ id (uuid)     ───────┼────────►│ user_id (uuid)           │
│ email                │         │ organization_id (uuid) ───┼──────┐
│ role (agency/brand)  │         │ organization_type         │      │
└──────────────────────┘         │ role (owner/admin/etc)   │      │
                                 │ status (active/inactive)  │      │
                                 └──────────────────────────┘      │
                                                                   │
                                          ┌────────────────────────┘
                                          ▼
                          ┌──────────────────────────┐
                          │  agencies (or brands)    │
                          ├──────────────────────────┤
                          │ id = organization_id ────┼── Owner's user ID
                          │ agency_name              │
                          │ plan_tier               │
                          │ stripe_customer_id      │
                          │ seats_limit             │
                          │ ...all settings         │
                          └──────────────────────────┘
```

### Key Tables

| Table                      | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `organization_memberships` | Links users to organizations with roles and status   |
| `organization_invites`     | Pending team invitations with token-based acceptance |
| `organization_audit_logs`  | Audit trail for team member actions                  |
| `agencies` / `brands`      | Organization profiles (owner's data)                 |

### Organization ID Pattern

- The organization's ID equals the owner's `auth.users.id`
- Team members do NOT have their own row in `agencies`/`brands`
- Team members access the owner's row via `organization_memberships.organization_id`

---

## Role-Based Access Control (RBAC)

### Roles and Permissions

| Role                | Permissions                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **owner**           | Full access to all organization features, billing management, team management, ownership transfer                                                     |
| **admin**           | All permissions except ownership transfer and organization deletion; includes billing and team management                                             |
| **project_manager** | Create campaigns, approve deliverables, manage connections, licenses, contracts, jobs, and pay offers (no billing or team management)                 |
| **reviewer**        | Read-only access to all resources except billing/subscriptions (view deliverables, team, connections, clients, licenses, jobs, contracts, pay offers) |

### Permission Enum (Backend)

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
```

### Role to Permission Mapping (Current Implementation)

| Permission                 | Owner | Admin | Project Manager | Reviewer |
| -------------------------- | ----- | ----- | --------------- | -------- |
| CreateCampaigns            | ✅    | ✅    | ✅              | ❌       |
| ApproveDeliverables        | ✅    | ✅    | ✅              | ❌       |
| ViewDeliverables           | ✅    | ✅    | ✅              | ✅       |
| ManageBilling              | ✅    | ✅    | ❌              | ❌       |
| InviteTeamMembers          | ✅    | ✅    | ❌              | ❌       |
| UpdateMemberRoles          | ✅    | ✅    | ❌              | ❌       |
| ViewTeamMembers            | ✅    | ✅    | ✅              | ✅       |
| ViewBrandConnections       | ✅    | ✅    | ✅              | ✅       |
| ManageBrandConnections     | ✅    | ✅    | ✅              | ❌       |
| DisconnectBrandConnections | ✅    | ✅    | ✅              | ❌       |
| ViewClients                | ✅    | ✅    | ✅              | ✅       |
| ManageClients              | ✅    | ✅    | ✅              | ❌       |
| ViewLicenses               | ✅    | ✅    | ✅              | ✅       |
| ManageLicenses             | ✅    | ✅    | ✅              | ❌       |
| ManageJobs                 | ✅    | ✅    | ✅              | ❌       |
| ViewJobs                   | ✅    | ✅    | ✅              | ✅       |
| ManageContracts            | ✅    | ✅    | ✅              | ❌       |
| ViewContracts              | ✅    | ✅    | ✅              | ✅       |
| ManageSubscriptions        | ✅    | ✅    | ❌              | ❌       |
| ViewSubscriptions          | ✅    | ✅    | ✅              | ❌       |
| ManagePayOffers            | ✅    | ✅    | ✅              | ❌       |
| ViewPayOffers              | ✅    | ✅    | ✅              | ✅       |
| TransferOwnership          | ✅    | ❌    | ❌              | ❌       |
| DeleteOrganisation         | ✅    | ❌    | ❌              | ❌       |

### Permission Categories by Role

#### **Reviewer** (Read-Only Access)

**Can View:**

- Deliverables
- Team members
- Brand connections
- Clients
- Licenses
- Jobs
- Contracts
- Pay offers

**Cannot Do:**

- Create, edit, or approve anything
- Manage billing or subscriptions
- Invite team members or update roles
- Pay offers or manage any resources

#### **Project Manager** (Operational Access)

**Can Do Everything Reviewer Can Do PLUS:**

- Create campaigns
- Approve deliverables
- Pay offers
- Manage jobs, contracts, licenses
- Manage brand connections and clients
- View subscriptions & billing (read-only)

**Cannot Do:**

- Manage billing/subscriptions (upgrade plans)
- Invite team members
- Update member roles

#### **Admin** (Full Management Access)

**Can Do Everything Project Manager Can Do PLUS:**

- Manage billing & subscriptions
- Invite team members
- Update member roles
- Manage all organization settings

**Cannot Do:**

- Transfer ownership
- Delete organization

#### **Owner** (Complete Access)

**Can Do Everything Admin Can Do PLUS:**

- Transfer ownership to another member
- Delete the organization

### Organization Type Context

The permission system applies to both **Brands** and **Agencies** with context-specific meanings:

| Permission                 | Brand Context                           | Agency Context                   |
| -------------------------- | --------------------------------------- | -------------------------------- |
| ViewBrandConnections       | View creator relationships              | View brand partnerships          |
| ManageBrandConnections     | Manage creator relationships            | Manage brand partnerships        |
| DisconnectBrandConnections | Disconnect from creators                | Disconnect from brands           |
| ManageClients              | Manage brand's customers                | Manage agency's clients (brands) |
| ManageLicenses             | Manage licensing requests from creators | Manage licensing for talents     |
| ManagePayOffers            | Pay creator offers                      | Pay talent offers                |

**Note:** The permission system is unified across both organization types, ensuring consistent behavior while respecting each organization's context.

---

## Invitation Flow

### Creating an Invitation

1. Owner/admin creates invite via `POST /api/team/invites`
2. System generates UUID token, hashes it (SHA256), stores `token_hash`
3. Email sent with link: `{frontend_url}/invite/team/{raw_token}`
4. Invite expires after 72 hours

### Accepting an Invitation

1. Invitee visits link → `TeamInviteLanding.tsx` component
2. If user doesn't exist: prompts for password, creates user via Supabase signUp
3. OTP email verification (6-digit code)
4. After verification: `POST /api/invites/team/:token/accept`
5. Creates `organization_memberships` record with specified role
6. Redirects to appropriate dashboard

### Invitation States

| Status     | Description                             |
| ---------- | --------------------------------------- |
| `pending`  | Invitation sent, awaiting acceptance    |
| `accepted` | User has joined the organization        |
| `expired`  | 72 hours have passed without acceptance |
| `revoked`  | Owner/admin cancelled the invitation    |

---

## Data Access Pattern

### Backend Resolution

All backend endpoints MUST use `resolve_effective_agency_id()` or `resolve_effective_brand_id()` to get the correct organization ID:

```rust
pub async fn get_profile(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Resolves to organization_id for team members
    // or user.id for owners
    let agency_id = resolve_effective_agency_id(&state, &user).await?;

    let resp = state
        .pg
        .from("agencies")
        .select("*")
        .eq("id", &agency_id)  // Uses resolved organization ID
        .limit(1)
        .execute()
        .await?;
    // ...
}
```

### Resolution Logic

1. Check if user has membership in `organization_memberships`
2. If found, return `organization_id` (owner's user ID)
3. If not found, check if user is legacy owner (`user.id == agencies.id`)
4. Return the resolved ID for all data access

### Frontend Profile Loading

The `AuthProvider.tsx` checks for membership FIRST for agency/brand roles:

```typescript
// For agency/brand roles, check membership first
if (roleHint === "agency" || roleHint === "brand") {
  const membershipResp = await tryFetchMembership();
  if (membershipResp.data) {
    // Fetch organization's profile (owner's data)
    const { data: orgData } = await supabase
      .from(organizationTable)
      .select("*")
      .eq("id", organizationId) // organization_id from membership
      .maybeSingle();

    // Set profile with organization data + membership info
    setProfile({
      ...(orgData || {}),
      id: userId,
      organization_id: organizationId,
      membership_role: membership.role,
      // ... other fields
    });
    return;
  }
}
```

### Profile Fields for Team Members

| Field                           | Source                | Description                                      |
| ------------------------------- | --------------------- | ------------------------------------------------ |
| `id`                            | Team member's user ID | The user's own ID                                |
| `organization_id`               | Membership            | The organization's ID (owner's user ID)          |
| `organization_name`             | Organization profile  | Organization's display name                      |
| `membership_role`               | Membership            | The member's role (admin, project_manager, etc.) |
| `plan_tier`                     | Organization profile  | Organization's subscription level                |
| `agency_name`, `logo_url`, etc. | Organization profile  | All settings inherited from organization         |

---

## Row-Level Security (RLS) Policies

### Helper Functions

```sql
-- Check if user is a team member of an agency
CREATE FUNCTION public.is_agency_team_member(check_agency_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    -- User is the owner (agency_id matches their user ID)
    SELECT 1 FROM agencies WHERE id = check_agency_id AND id = auth.uid()
    UNION
    -- User is an active team member
    SELECT 1 FROM organization_memberships
    WHERE organization_type = 'agency'
      AND organization_id = check_agency_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is a team member of a brand
CREATE FUNCTION public.is_brand_team_member(check_brand_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM brands WHERE id = check_brand_id AND id = auth.uid()
    UNION
    SELECT 1 FROM organization_memberships
    WHERE organization_type = 'brand'
      AND organization_id = check_brand_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Tables with Team Member RLS

| Table                          | Policy Pattern                                   |
| ------------------------------ | ------------------------------------------------ |
| `agencies`                     | SELECT/UPDATE using `is_agency_team_member(id)`  |
| `brands`                       | SELECT/UPDATE using `is_brand_team_member(id)`   |
| `agency_notification_settings` | All ops using `is_agency_team_member(agency_id)` |
| `agency_tax_currency_settings` | All ops using `is_agency_team_member(agency_id)` |
| `agency_email_templates`       | All ops using `is_agency_team_member(agency_id)` |
| `agency_commission_settings`   | All ops using `is_agency_team_member(agency_id)` |

### Example RLS Policy

```sql
-- Allow team members to view notification settings
CREATE POLICY "agency_notification_settings select own"
  ON agency_notification_settings
  FOR SELECT USING (public.is_agency_team_member(agency_id));

-- Allow team members to insert notification settings
CREATE POLICY "agency_notification_settings insert own"
  ON agency_notification_settings
  FOR INSERT WITH CHECK (public.is_agency_team_member(agency_id));

-- Allow team members to update notification settings
CREATE POLICY "agency_notification_settings update own"
  ON agency_notification_settings
  FOR UPDATE USING (public.is_agency_team_member(agency_id));
```

---

## Shared Data Between Owner and Team Members

| Data Type                                          | Shared?      | Notes                                          |
| -------------------------------------------------- | ------------ | ---------------------------------------------- |
| **Profile** (agency_name, logo, etc.)              | ✅ Yes       | Team members see organization's profile        |
| **Subscription/Plan** (plan_tier)                  | ✅ Yes       | Team members have same plan entitlements       |
| **Billing** (Stripe customer, invoices)            | ✅ Read-only | Managed by owner/admin only                    |
| **Settings** (notifications, tax, email templates) | ✅ Yes       | All team members can view/modify based on role |
| **Roster** (talent cards)                          | ✅ Yes       | Shared across organization                     |
| **Campaigns**                                      | ✅ Yes       | Based on permission to create/edit             |
| **Team Management**                                | Role-based   | Only owner/admin can manage team               |
| **Licensing Requests**                             | ✅ Yes       | Based on permission                            |
| **Brand Connections**                              | ✅ Yes       | Based on permission                            |

---

## API Endpoints

### Team Management

| Endpoint                          | Method | Purpose                                          | Permission Required |
| --------------------------------- | ------ | ------------------------------------------------ | ------------------- |
| `/api/team/context`               | GET    | Get team context (members, invites, permissions) | ViewTeamMembers     |
| `/api/team/members`               | GET    | List team members                                | ViewTeamMembers     |
| `/api/team/invites`               | GET    | List invites                                     | ViewTeamMembers     |
| `/api/team/invites`               | POST   | Create invite                                    | InviteTeamMembers   |
| `/api/team/members/:user_id/role` | POST   | Update member role                               | UpdateMemberRoles   |
| `/api/team/audit-logs`            | GET    | Get team activity                                | ViewTeamMembers     |

### Invitation (Public)

| Endpoint                           | Method | Purpose                     |
| ---------------------------------- | ------ | --------------------------- |
| `/api/invites/team/:token`         | GET    | Get invite details by token |
| `/api/invites/team/:token/accept`  | POST   | Accept invitation           |
| `/api/invites/team/:token/decline` | POST   | Decline invitation          |

### Profile (Resolves to Organization)

| Endpoint                   | Method | Purpose                                                |
| -------------------------- | ------ | ------------------------------------------------------ |
| `/api/agency-profile/user` | GET    | Get agency profile (returns org data for team members) |
| `/api/brand-profile/user`  | GET    | Get brand profile (returns org data for team members)  |

---

## Security Considerations

### Token Security

- **Hashing**: Invitation tokens are SHA256 hashed before storage
- **Expiration**: Invitations expire after 72 hours
- **Single Use**: Tokens are invalidated after acceptance/decline

### Authentication

- **Email Verification**: Required before membership is created
- **OTP Verification**: 6-digit code sent to verify email ownership
- **Session Management**: Standard Supabase auth sessions

### Authorization

- **Permission Checks**: All sensitive operations check `require_agency_permission()`
- **RBAC Middleware**: Backend uses permission-based middleware
- **Audit Logging**: All team management actions logged to `organization_audit_logs`

### Data Isolation

- **Organization-scoped queries**: All queries use resolved organization ID
- **RLS Enforcement**: Row-level security prevents cross-organization access
- **No Profile Leakage**: Team members cannot access other organizations' data

---

## Implementation Checklist

When adding new features for agencies/brands, ensure:

### Backend

- [ ] Uses `resolve_effective_agency_id()` / `resolve_effective_brand_id()`
- [ ] Has appropriate permission check via `require_agency_permission()`
- [ ] Logs sensitive actions to audit log
- [ ] Returns organization-scoped data

### Frontend

- [ ] Queries use `organization_id` instead of `profile.id` for settings
- [ ] UI respects `membership_role` for showing/hiding features
- [ ] Settings components use `effectiveAgencyId` pattern
- [ ] Handles both owner and team member profiles correctly

### Database

- [ ] RLS policies use `is_agency_team_member()` helper function
- [ ] All agency-scoped tables have appropriate RLS
- [ ] Migration included for any new tables

### Testing

- [ ] Test with owner account
- [ ] Test with team member account (each role)
- [ ] Verify plan_tier is inherited correctly
- [ ] Verify settings are shared correctly
- [ ] Verify permissions restrict actions appropriately

---

## Troubleshooting

### Common Issues

| Issue                          | Cause                                                    | Solution                                    |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------- |
| 403 Forbidden on settings      | RLS policy doesn't include team member check             | Update RLS to use `is_agency_team_member()` |
| Wrong plan_tier shown          | Frontend using `profile.id` instead of `organization_id` | Use `effectiveAgencyId` pattern             |
| Team member sees empty profile | Backend using `user.id` directly                         | Use `resolve_effective_agency_id()`         |
| Can't invite team members      | Missing `InviteTeamMembers` permission                   | Check user's role has the permission        |
| Settings not saving            | Using wrong agency_id in upsert                          | Use `organization_id` from profile          |

### Debug Logging

Enable debug logging in AuthProvider:

```typescript
console.log("[AuthProvider] Membership check result:", {
  hasData: !!membershipResp.data,
  data: membershipResp.data,
});
console.log("[AuthProvider] Organization profile fetch:", {
  organizationId,
  plan_tier: orgData?.plan_tier,
});
```

---

## Migration Files

| File                                      | Purpose                                       |
| ----------------------------------------- | --------------------------------------------- |
| `2026-04-04_team_rbac_foundation.sql`     | Core tables: memberships, invites, audit_logs |
| `2026-04-06_team_member_rls_policies.sql` | RLS policies for team member access           |

---

## KYC Verification Sharing

### Overview

Team members share the same KYC verification status as the organization owner. The KYC fields are stored on the `agencies` or `brands` table and are accessible to all team members through the organization membership.

### KYC Fields (stored on agencies/brands table)

| Field                  | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `kyc_status`           | Current status: `not_started`, `pending`, `approved`, `rejected` |
| `liveness_status`      | Liveness check status                                            |
| `kyc_provider`         | Provider used (e.g., `veriff`)                                   |
| `kyc_session_id`       | Current/last session ID                                          |
| `verified_at`          | Timestamp when verified                                          |
| `kyc_rejection_reason` | Human-readable rejection reason                                  |
| `kyc_rejection_code`   | Machine-readable rejection code                                  |

### Backend Implementation

The KYC session creation must use `resolve_effective_agency_id()` to allow team members to create KYC sessions:

```rust
pub async fn create_session(
    State(state): State<AppState>,
    user: AuthUser,
    Json(req): Json<SessionRequest>,
) -> Result<Json<SessionResponse>, (StatusCode, String)> {
    // For agencies and brands, resolve the effective organization ID
    let profile_id = if user.role == "agency" {
        resolve_effective_agency_id(&state, &user).await?
    } else if user.role == "brand" {
        resolve_effective_brand_id(&state, &user).await?
    } else {
        // For creators, use the requested or user ID
        let requested = req.organization_id.as_ref().unwrap_or(&user.id);
        resolve_profile_id_for_role(&state, &user, requested).await?
    };

    // Check current KYC status from organization's profile
    let current_status = get_current_kyc_status(&state, &profile_id, &user.role).await?;
    // ... rest of KYC session creation
}
```

### RLS for KYC Sessions Table

The `agency_veriff_sessions` table tracks KYC session usage:

```sql
CREATE POLICY "agency_veriff_sessions select own"
  ON agency_veriff_sessions
  FOR SELECT USING (public.is_agency_team_member(agency_id));
```

### Permission Requirements

| Action                   | Permission Required | Notes                                    |
| ------------------------ | ------------------- | ---------------------------------------- |
| View KYC Status          | ViewTeamMembers     | Available to all roles                   |
| Create KYC Session       | Owner or Admin only | Typically restricted to billing managers |
| View KYC Session History | ViewTeamMembers     | For audit purposes                       |

### Team Member KYC Flow

1. Team member logs in and sees organization's KYC status
2. If not verified, admin/owner can initiate KYC verification
3. KYC status updates are visible to all team members
4. Monthly KYC session cap applies to organization (not individual users)

### Frontend Access

The frontend accesses KYC status through the profile (which contains organization data for team members):

```typescript
// For team members, profile contains organization's kyc_status
const kycStatus = profile?.kyc_status;
const isVerified = kycStatus === "approved";
```
