# Database ER Diagram

This ER diagram reflects the current schema defined by the Supabase migrations in `likelee-ui/supabase/migrations` as of the latest change. It is derived from the following files:

- 20251118_profiles.sql
- 20251118_profiles_verification.sql
- 20251119_profiles_fields.sql
- 20251120_profiles_avatar_canonical.sql
- 20251120_profiles_cameo_images.sql
- 20251121_profiles_id_default.sql

Currently, the schema centers on a single table `profiles` with no explicit foreign keys.

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

    %% legacy timestamps (from initial table)
    timestamptz created_at "default now()"
    timestamptz updated_at
  }
```

## Notes
- The initial migration created `profiles.id` as `TEXT PRIMARY KEY`. The later migration `20251121_profiles_id_default.sql` ensures a UUID default via `gen_random_uuid()`. If your environment still has `id` as TEXT, apply a conversion migration.
- No foreign keys are defined yet. If you plan to link `profiles.id` to `auth.users(id)`, we can extend the schema and update this diagram.
