# Database ER Diagram

This ER diagram reflects the current schema defined by the Supabase migrations in `/supabase/migrations` as of the latest change. It is derived from the following files:

- 20251118_profiles.sql
- 20251118_profiles_verification.sql
- 20251119_profiles_fields.sql
- 20251120_profiles_avatar_canonical.sql
- 20251120_profiles_cameo_images.sql
- 20251121_profiles_id_default.sql
- 2025-11-21_royalty_wallet_mvp.sql
- 2025-11-21_consolidated_profiles_wallet.sql
- 2025-11-23_moderation_events.sql
- 20251127_create_org_and_agency_users.sql
- 20251204101400_add_creator_custom_rates.sql

Currently, the schema includes `profiles`, `royalty_ledger`, `creator_custom_rates` (FK → profiles), plus a read-only aggregation view `v_face_payouts`.

## Mermaid ER Diagram

```mermaid
erDiagram
  PROFILES {
    uuid id PK "PRIMARY KEY, DEFAULT gen_random_uuid()"
    text email
    text full_name
    text creator_type

    %% location & bio
    text city
    text state
    date birthdate
    text bio
    text gender

    %% arrays
    text[] content_types
    text[] industries
    text[] work_types
    text[] brand_categories
    text[] ethnicity
    text[] vibes

    %% platforms & handles
    text primary_platform
    text platform_handle
    text instagram_handle
    text twitter_handle

    %% modeling / talent
    text representation_status
    text headshot_url

    %% athlete
    text sport
    text athlete_type
    text school_name
    integer age
    text languages

    %% verification
    text kyc_status "not_started | pending | approved | rejected (default not_started)"
    text liveness_status "not_started | pending | approved | rejected (default not_started)"
    text kyc_provider
    text kyc_session_id
    timestamptz verified_at

    %% visibility & status
    text visibility "default 'private'"
    text status "default 'waitlist'"

    %% audit
    timestamptz created_date "default now()"
    timestamptz updated_date "default now()"
    text created_by_id
    text created_by
    boolean is_sample "default false"

    %% content extras
    text content_other

    %% media
    text avatar_canonical_url
    text cameo_front_url
    text cameo_left_url
    text cameo_right_url

    %% pricing (USD-only)
    integer base_monthly_price_cents "check >= 15000 (i.e., $150)"
    text currency_code "check = 'USD'"
    timestamptz pricing_updated_at

    %% legacy timestamps (from initial table)
    timestamptz created_at "default now()"
    timestamptz updated_at
  }

  REFERENCE_IMAGES {
    uuid id PK "PRIMARY KEY, DEFAULT gen_random_uuid()"
    uuid user_id FK "REFERENCES profiles(id)"
    text section_id
    text storage_bucket
    text storage_path
    text public_url
    integer width
    integer height
    bigint size_bytes
    text mime_type
    text sha256
    text moderation_status "enum('pending','approved','flagged')"
    text moderation_reason
    timestamptz created_at "default now()"
    uuid created_by
  }

  ROYALTY_LEDGER {
    uuid id PK "PRIMARY KEY, DEFAULT gen_random_uuid()"
    uuid face_id FK "REFERENCES profiles(id)"
    text booking_id
    text brand_name
    integer amount_cents "check >= 0"
    text currency_code "check = 'USD'"
    text status "enum('pending','paid')"
    date period_month "first day of month"
    timestamptz created_at "default now()"
  }

  MODERATION_EVENTS {
    uuid id PK "PRIMARY KEY, DEFAULT gen_random_uuid()"
    text image_url
    text user_id "logical reference to profiles(id)"
    text image_role "front | left | right | other"
    boolean flagged "default false"
    jsonb labels "array of moderation labels"
    text review_status "enum('pending','approved','rejected'), default 'pending'"
    text reviewed_by
    timestamptz reviewed_at
    timestamptz created_at "default now()"
  }

  ORGANIZATION_PROFILES {
    uuid id PK "PRIMARY KEY, DEFAULT gen_random_uuid()"
    uuid owner_user_id "logical FK → profiles(id)"
    text email
    text organization_name
    text contact_name
    text contact_title
    text organization_type
    text website
    text phone_number
    text industry
    text primary_goal
    text geographic_target
    text production_type
    text budget_range
    text uses_ai
    text creates_for
    jsonb roles_needed
    text client_count
    text campaign_budget
    jsonb services_offered
    text handle_contracts
    text talent_count
    text licenses_likeness
    jsonb open_to_ai
    jsonb campaign_types
    text bulk_onboard
    text status
    timestamptz created_at
    timestamptz updated_at
  }

  AGENCY_USERS {
    uuid id PK "PRIMARY KEY, DEFAULT gen_random_uuid()"
    uuid agency_id FK "REFERENCES organization_profiles(id)"
    uuid user_id "logical FK → profiles(id)"
    text role "enum('owner','admin','manager','viewer')"
    text status "enum('active','invited','suspended')"
    timestamptz created_at
  }

  V_FACE_PAYOUTS {
    uuid face_id
    text face_name
    date period_month
    integer paid_cents
    integer pending_cents
    integer total_cents
    integer event_count
  }

  CREATOR_CUSTOM_RATES {
    bigint id PK "PRIMARY KEY, GENERATED BY DEFAULT AS IDENTITY"
    uuid creator_id FK "REFERENCES profiles(id) ON DELETE CASCADE"
    text rate_type "'content_type' or 'industry'"
    text rate_name
    integer price_per_week_cents
    timestamptz created_at "default now()"
    timestamptz updated_at "default now()"
  }

  PROFILES ||--o{ ROYALTY_LEDGER : face_id
  PROFILES ||--o{ MODERATION_EVENTS : user_id
  PROFILES ||--o{ REFERENCE_IMAGES : user_id
  PROFILES ||--o{ ORGANIZATION_PROFILES : owner_user_id
  PROFILES ||--o{ CREATOR_CUSTOM_RATES : creator_id
  ORGANIZATION_PROFILES ||--o{ AGENCY_USERS : agency_id
  PROFILES ||--o{ AGENCY_USERS : user_id
```

## Notes
- The initial migration created `profiles.id` as `TEXT PRIMARY KEY`. The later migration `20251121_profiles_id_default.sql` ensures a UUID default via `gen_random_uuid()`. If your environment still has `id` as TEXT, apply a conversion migration.
- `royalty_ledger.face_id` references `profiles(id)`; the view `v_face_payouts` aggregates paid/pending amounts by face and month for read-only dashboard usage.
- The consolidated migration `2025-11-21_consolidated_profiles_wallet.sql` couples minimal `profiles` prerequisites and the Royalty Wallet schema (ledger, view, policies) to provision new environments consistently. Prefer running this single file in greenfield environments to avoid ordering issues.

## Relationship Details

- **PROFILES → ORGANIZATION_PROFILES (owner_user_id)**
  - Each organization profile is owned by a single user profile (`owner_user_id`).
  - Cardinality: 1 profile can own 0..N organizations. Each organization has exactly 1 owner.
  - Access: RLS allows only the owner to select/insert/update their own organization rows.

- **ORGANIZATION_PROFILES → AGENCY_USERS (agency_id)**
  - Membership table linking organizations (agencies/brands) to users who have seats/roles.
  - Cardinality: 1 organization has 0..N members; a user can appear in 0..N organizations.
  - Unique constraint `(agency_id, user_id)` prevents duplicates.
  - Roles: `owner | admin | manager | viewer`. Status: `active | invited | suspended`.
  - Access: RLS permits members (or owner) to select rows; only owners can insert/update membership.

- **PROFILES → AGENCY_USERS (user_id)**
  - References the user profile who is a member of an organization.
  - Cardinality: 1 profile can belong to 0..N organizations; each membership row maps exactly 1 profile to 1 organization.

- **PROFILES → ROYALTY_LEDGER (face_id)**
  - Ledger entries attribute earnings to a Face (stored in `profiles`).
  - Cardinality: 1 face can have 0..N ledger entries; each ledger entry references exactly 1 face.
  - Used by dashboards and the `V_FACE_PAYOUTS` view for aggregation.

- **PROFILES → MODERATION_EVENTS (user_id)**
  - Moderation events are tied to the profile that submitted the image or action.
  - Cardinality: 1 profile can have 0..N moderation events; each event references exactly 1 profile.

- **PROFILES → CREATOR_CUSTOM_RATES (creator_id)**
  - Custom licensing rates for specific content types and industries set by creators.
  - Cardinality: 1 profile can have 0..N custom rates; each rate references exactly 1 profile.
  - UNIQUE constraint on `(creator_id, rate_type, rate_name)` prevents duplicate rates.
  - Function `upsert_creator_rates(p_creator_id, p_rates)` handles batch updates with security checks.
  - RLS policies ensure creators can only manage their own rates.

- **V_FACE_PAYOUTS** (view)
  - Read-only aggregation across `ROYALTY_LEDGER` grouped by face and month.
  - No direct writes; used for analytics/overview.

### Compliance and KYC/Liveness Context
- KYC status for user profiles is stored on `PROFILES` and is used to gate sensitive actions.
- Organization owner’s KYC must be approved to unlock “Create Agency” tools in the UI.
- Organization-level KYC (via Veriff) is initiated on creation and tracked via status endpoints.

### Practical Flows
- Create Organization
  - User (owner profile) creates `ORGANIZATION_PROFILES` row → Triggers organization KYC session.
  - On approval, owner can add members by inserting rows into `AGENCY_USERS` (subject to RLS: owner-only insert).

- Membership Management
  - Owner adds team members (emails/users) → rows in `AGENCY_USERS` with role/status.
  - Members gain read access to the organization’s membership list via RLS.

- Earnings Attribution
  - Bookings/payments produce `ROYALTY_LEDGER` entries tied to a Face (in `PROFILES`).
  - `V_FACE_PAYOUTS` aggregates for dashboards.
