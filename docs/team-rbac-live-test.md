# Team RBAC Live Test Flow

This flow is for manually validating the remaining epic work in a running dev environment.

## Prerequisites

- Apply the migration:
  - `supabase db push`
- Start the backend and frontend:
  - `cargo run --manifest-path likelee-server/Cargo.toml`
  - `npm run dev --prefix likelee-ui`
- Use three browser sessions or profiles:
  - `Owner`: an existing `agency` or `brand` owner account
  - `Project Manager`: a fresh account you will invite
  - `Reviewer`: a fresh account you will invite

## Agency Team Flow

1. Sign in as an agency owner and open `AgencyDashboard -> Settings -> Team`.
2. Invite a `project_manager`.
3. Invite a `reviewer`.
4. Confirm both invites appear under pending invites and in the activity log.
5. Open the invite email or copy the invite link from the database and open `/invite/team/:token`.
6. Complete signup, OTP verification, and accept the invite for each invited user.
7. Re-open the owner Team tab and confirm both users moved from pending invites to active members.
8. Change the `reviewer` role to `admin`.
9. Confirm the role change appears in the activity log.

## Billing Permission Check

1. Sign in as the invited `project_manager`.
2. Open `/AgencySubscribe`.
3. Confirm the page redirects to `/Unauthorized`.
4. Sign in as the invited `admin`.
5. Open `/AgencySubscribe`.
6. Confirm the subscription page loads and checkout can be initiated.

## Deliverable Permission Check

1. Sign in as the invited `reviewer` or `project_manager` with an agency membership that has `approve_deliverables`.
2. Open the agency deliverables section.
3. Confirm `Submit to Brand`, `Revise`, and `Approve` actions are enabled only for roles with deliverable approval permission.
4. Sign in as a role without that permission and confirm those actions are disabled and direct action attempts show an error toast.

## Brand Team Flow

1. Sign in as a brand owner and open `BrandDashboard -> Settings`.
2. Confirm the Team Management card shows live members, pending invites, and activity.
3. Invite a `project_manager`.
4. Accept the invite via `/invite/team/:token`.
5. Confirm the new member appears in Brand Settings and the activity log updates.

## Brand Campaign Permission Check

1. Sign in as a brand `project_manager`.
2. Open `/BrandCampaignDashboard`.
3. Confirm the page loads and you can create a campaign.
4. Create offers from the campaign to a connected agency or creator.
5. Sign in as a brand member without `create_campaigns`.
6. Open `/BrandCampaignDashboard`.
7. Confirm the route redirects to `/Unauthorized`.

## Brand Deliverable Approval Check

1. As a brand member with `approve_deliverables`, open the deliverables flow in `BrandDashboard`.
2. Approve or request changes on a submitted deliverable.
3. Confirm the action succeeds.
4. As a brand member without `approve_deliverables`, try the same action.
5. Confirm the UI blocks it and the backend returns `403` if called directly.

## API Smoke Checks

Use a valid bearer token and replace `<org_type>` with `agency` or `brand`.

- `GET /api/team/context?organization_type=<org_type>`
- `GET /api/team/audit-logs?organization_type=<org_type>`
- `POST /api/team/invites?organization_type=<org_type>`
- `POST /api/team/members/:user_id/role?organization_type=<org_type>`
- `GET /api/invites/team/:token`
- `POST /api/invites/team/:token/accept`
- `POST /api/invites/team/:token/decline`

## Expected Results

- Team tabs show live members, invites, and activity.
- Invite acceptance creates an active organization membership.
- Role changes take effect immediately for guarded pages.
- Billing routes require `manage_billing`.
- Campaign routes require `create_campaigns`.
- Deliverable approval routes require `approve_deliverables`.
