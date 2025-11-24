# Database ER Diagram

This ER diagram reflects the current schema defined by the Supabase migrations in `likelee-ui/supabase/migrations` as of the latest change. It is derived from the following files:

- 20251118_profiles.sql
- 20251118_profiles_verification.sql
- 20251119_profiles_fields.sql
- 20251120_profiles_avatar_canonical.sql
- 20251120_profiles_cameo_images.sql
- 20251121_profiles_id_default.sql
- 2025-11-21_royalty_wallet_mvp.sql
- 2025-11-21_consolidated_profiles_wallet.sql
- 2025-11-23_moderation_events.sql

Currently, the schema includes `profiles` and the new `royalty_ledger` table (FK → profiles), plus a read-only aggregation view `v_face_payouts`.

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
    integer per_use_price_cents "check 500..20000 (i.e., $5..$200)"
    text currency_code "check = 'USD'"
    timestamptz pricing_updated_at

    %% legacy timestamps (from initial table)
    timestamptz created_at "default now()"
    timestamptz updated_at
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

  V_FACE_PAYOUTS {
    uuid face_id
    text face_name
    date period_month
    integer paid_cents
    integer pending_cents
    integer total_cents
    integer event_count
  }

  PROFILES ||--o{ ROYALTY_LEDGER : face_id
  PROFILES ||--o{ MODERATION_EVENTS : user_id
```

## Notes
- The initial migration created `profiles.id` as `TEXT PRIMARY KEY`. The later migration `20251121_profiles_id_default.sql` ensures a UUID default via `gen_random_uuid()`. If your environment still has `id` as TEXT, apply a conversion migration.
- `royalty_ledger.face_id` references `profiles(id)`; the view `v_face_payouts` aggregates paid/pending amounts by face and month for read-only dashboard usage.
- The consolidated migration `2025-11-21_consolidated_profiles_wallet.sql` couples minimal `profiles` prerequisites and the Royalty Wallet schema (ledger, view, policies) to provision new environments consistently. Prefer running this single file in greenfield environments to avoid ordering issues.
