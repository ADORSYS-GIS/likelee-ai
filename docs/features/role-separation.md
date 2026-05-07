# Role Separation Policy

> **Last updated:** 2026-04-29
> **Status:** Enforced at database layer, with backend error sanitization

## Summary

Each user account in LikeLee may hold **exactly one role**: `creator`, `brand`, or `agency`. A user must never have profiles in more than one role table simultaneously. This document describes the architecture, validation points, error handling, and enforcement mechanisms that guarantee this invariant.

---

## Architecture

### Role Tables

| Table | Role | Primary Key | Notes |
|-------|------|-------------|-------|
| `public.creators` | `creator` / `talent` | `id uuid` (auto-generated) | Individual talent profiles |
| `public.brands` | `brand` | `id uuid` → `auth.users(id)` | Company/brand profiles |
| `public.agencies` | `agency` | `id uuid` → `auth.users(id)` | Agency profiles (marketing, talent, sports) |

### Role Storage in Supabase Auth

- **`user_metadata.role`** — Set during registration; one of `"creator"`, `"brand"`, `"agency"`
- **`app_metadata.role`** — May also contain the role; used as fallback during JWT parsing

### Registration Endpoints

| Endpoint | Role Set | Profile Table |
|----------|----------|---------------|
| `POST /api/creator-register` | `"creator"` | `creators` |
| `POST /api/brand-register` | `"brand"` | `brands` |
| `POST /api/agency-register` | `"agency"` | `agencies` |

---

## Enforcement Layers

### Layer 1: Database-Level Triggers

**File:** `supabase/migrations/2026-04-29_enforce_single_role.sql`

A PostgreSQL trigger function `_enforce_single_role()` runs `BEFORE INSERT OR UPDATE` on all three role tables. It checks whether the user already has a profile in a *different* role table and raises a custom exception (`ERRCODE = '23P01'`) if so.

The trigger logic:
- **On INSERT:** Counts profiles across all three tables. Rejects if count > 0.
- **On UPDATE:** Counts profiles in the *other two* tables only (excludes the current table since the row already exists). Rejects if count > 0.

This provides a safety net even if profile creation bypasses backend validation.

### Layer 2: Error Sanitization

**File:** `likelee-server/src/errors.rs`

The `sanitize_db_error()` function maps the custom PostgreSQL error code `23P01` to a user-friendly message:

```json
{
  "error": "This account already has a profile with a different role. Each user may only have one role (creator, brand, or agency). Please contact support if you believe this is incorrect.",
  "code": "23P01"
}
```

The response is returned with HTTP status `409 Conflict`.

---

## Frontend Validation

### Login Flow

**File:** `likelee-ui/src/pages/Login.tsx`

The login page has role tabs (Creator / Brand / Agency). When a user logs in:
1. The selected `userType` is compared against `profile.role` from the hydrated profile
2. If they don't match, the user is signed out and shown an error message
3. The error message should clearly indicate the role mismatch (e.g., "This account is registered as a Creator, not a Brand")

### OAuth Flow

**File:** `likelee-ui/src/auth/onboarding.ts`

OAuth sign-in stores an `authIntent` in `localStorage` with the role hint. This is used for:
- Redirecting new users to the correct signup page
- Pre-selecting the role tab on the login page

The role hint is **not** validated against existing profiles during OAuth login — the `AuthProvider` resolves the actual role from the database profile tables.

### Route Guards

**File:** `likelee-ui/src/auth/ProtectedRoute.tsx`

Routes can specify `allowedRoles`. If the user's resolved profile role is not in the allowed list, they are redirected to `/Unauthorized`.

---

## Team System and Role Separation

### Team Memberships

**File:** `likelee-server/src/team/access.rs`

The team system allows users to be members of organizations (brands or agencies) without changing their personal role. Key points:

- **`organization_memberships`** table links users to organizations with a `team_role` (owner, admin, project_manager, reviewer)
- A creator can be invited to an agency team and accept the invite — this creates a membership row but does **not** create a second profile in the `agencies` table
- The `resolve_effective_*_id()` functions (`resolve_effective_brand_id`, `resolve_effective_agency_id`) determine which profile ID to use based on team membership
- Team members see the organization's profile data (subscriptions, plan tier, etc.) but their personal role remains unchanged

### Invite Acceptance

**File:** `likelee-server/src/team/invites.rs`

When a creator accepts an agency invite:
1. The invite is validated (not expired, not already accepted)
2. An `organization_memberships` row is created
3. The creator's `user_metadata` is updated with team context (`organization_id`, `organization_type`, `team_role`)
4. The creator's personal `role` in `user_metadata` is **not** changed to `"agency"` — it remains `"creator"` or `"talent"`
5. The `last_role_changed_at` timestamp is updated

This ensures the creator maintains their individual identity while gaining access to the agency's resources.

---

## MFA Restriction

**File:** `docs/MFA_ROLE_RESTRICTION_IMPLEMENTATION.md`

MFA (multi-factor authentication) is restricted to creator/talent users only. Brands and agencies use team-based access control instead:

- **Creators/Talent:** Can enable MFA for their personal accounts
- **Brands/Agencies:** Use team membership and role-based permissions for access control
- MFA endpoints check the user's role and reject non-creator users with a `403 Forbidden`

---

## Error Handling

### Backend Errors

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| User already has profile in another role table (DB trigger) | 409 | `23P01` | `"This account already has a profile with a different role..."` |
| Profile not found | 404 | `profile_not_found` | `"{Role} profile not found."` |
| Unauthorized profile access | 403 | — | `"You do not have permission to access this record."` |

### Frontend Errors

| Scenario | User Message |
|----------|-------------|
| Role mismatch on login | `"Account role not found. Please contact support."` (should be improved to specify the actual role) |
| Profile load failure | `"Your account doesn't have a profile yet..."` |
| Unauthorized route access | Redirect to `/Unauthorized` |

---

## Migration and Existing Data

### Pre-Existing Violations

The migration `2026-04-29_enforce_single_role.sql` includes a check for pre-existing data violations. If any user has profiles in multiple role tables, a `WARNING` is raised during migration execution. These must be resolved manually before the triggers can fully protect the system.

### Resolving Violations

If a user is found with multiple role profiles:
1. Determine which role is the correct/active one
2. Delete the incorrect profile row(s) from the other table(s)
3. Verify `user_metadata.role` matches the remaining profile
4. Document the resolution in the user's support ticket

---

## Testing Strategy

### Unit Tests

1. **Database trigger** — Test INSERT and UPDATE scenarios for each table combination
2. **Error sanitization** — Test that `23P01` maps to the correct user-friendly message

### Integration Tests

1. **Signup flow** — Register as creator, then attempt to register as brand with same email
2. **OAuth flow** — Sign in with Google as creator, then attempt brand signup
3. **Team invite** — Creator accepts agency invite, verify role remains `creator`
4. **Profile update** — Brand user attempts to create agency profile, verify rejection

### Manual Testing Checklist

- [ ] Create new creator account → verify only `creators` row exists
- [ ] Create new brand account → verify only `brands` row exists
- [ ] Create new agency account → verify only `agencies` row exists
- [ ] Attempt to create second profile type with same email → verify 409 error
- [ ] Creator accepts agency invite → verify `organization_memberships` row created but no `agencies` row
- [ ] Login with wrong role tab → verify error message and sign-out
- [ ] Update profile as team member → verify effective ID resolution works correctly

---

## Files Reference

### Backend (Rust)
- `likelee-server/src/auth.rs` — `AuthUser` struct, JWT parsing
- `likelee-server/src/errors.rs` — `sanitize_db_error()` with role mixing error mapping
- `likelee-server/src/creators.rs` — Creator registration and profile management
- `likelee-server/src/brands.rs` — Brand registration and profile management
- `likelee-server/src/agencies.rs` — Agency registration and profile management
- `likelee-server/src/team/access.rs` — Team membership resolution
- `likelee-server/src/team/permissions.rs` — Role-based permission definitions
- `likelee-server/src/team/invites.rs` — Team invite acceptance flow

### Frontend (TypeScript/React)
- `likelee-ui/src/pages/Login.tsx` — Login with role tabs and role mismatch detection
- `likelee-ui/src/pages/Register.tsx` — Creator registration
- `likelee-ui/src/pages/OrganizationSignup.tsx` — Brand/Agency registration
- `likelee-ui/src/auth/AuthProvider.tsx` — Profile hydration and role resolution
- `likelee-ui/src/auth/onboarding.ts` — Auth intent, role-based routing helpers
- `likelee-ui/src/auth/ProtectedRoute.tsx` — Route guards based on user role

### Database
- `supabase/migrations/2026-04-29_enforce_single_role.sql` — Database triggers for role separation
- `supabase/migrations/0001_core_profiles.sql` — Original table definitions for `creators`, `brands`, `agencies`

### Documentation
- `docs/USER_PROFILE_SEPARATION.md` — User vs organization profile separation
- `docs/MFA_ROLE_RESTRICTION_IMPLEMENTATION.md` — MFA restrictions by role
- `docs/ROLE_SEPARATION_POLICY.md` — This document

---

## Design Decisions

### Why Not a Single "users" Table with Role Column?

The current architecture uses separate profile tables because:
1. Each role has significantly different fields and relationships
2. Team membership is only relevant for brands and agencies
3. Creators have unique features (MFA, portfolio, bookings)
4. Separate tables enable cleaner RLS policies and query patterns

### Why Triggers Instead of a Unique Constraint?

PostgreSQL doesn't support cross-table unique constraints. Triggers provide:
1. Flexibility to check across multiple tables
2. Custom error messages with context
3. Ability to handle UPDATE scenarios (not just INSERT)
4. Logging and auditing capabilities

### Why Keep Application-Level Check?

Database triggers are a safety net, but application-level validation provides:
1. Faster feedback (no round-trip to database)
2. Better error messages before the operation is attempted
3. Ability to handle business logic (e.g., "you can't be both a brand and an agency")
4. Consistent error handling across all code paths

---

## Future Considerations

1. **Role transfer** — If a user needs to change roles, provide a migration path that deletes the old profile before creating the new one
2. **Audit logging** — Log all role checks and violations for security monitoring
3. **Admin override** — Provide support tools to resolve edge cases (e.g., merge profiles, transfer ownership)
4. **Multi-role support** — If business requirements change, the trigger function can be modified to allow specific role combinations while still preventing others
