# Supabase Integration Architecture

## Overview

Supabase is used as a lightweight data backend for creator profile metadata mirrored from Firebase-authenticated users and for future app data. Authentication is handled by Firebase Authentication. The web app uses the Supabase REST API (via `@supabase/supabase-js`) with the public anon key and Row Level Security (RLS) policies to control access.

- Primary auth: Firebase Authentication (email/password, optional MFA/TOTP)
- Profile mirror: Supabase table `public.profiles` (Firebase `uid` → `profiles.id`)
- Creator onboarding: Business data goes to Base44 APIs (separate from Supabase)

## Data Flow

1. User registers/logs in with Firebase in the browser.
2. `AuthProvider` observes the auth state and, when a user is present, upserts a minimal record into Supabase `public.profiles`:
   - `id = user.uid`
   - `email = user.email`
   - `first_name = user.displayName`
   - `updated_at = now()`
3. The app can read this profile later to enrich UI, join with other app data, or drive analytics.

## Components and Files

- `src/auth/AuthProvider.tsx`
  - Subscribes to Firebase auth state.
  - Mirrors user info to Supabase via `supabase.from('profiles').upsert(...)`.
- `src/lib/supabase.ts`
  - Initializes `SupabaseClient` from Vite env vars:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
  - If missing, the client is not created and profile sync is skipped.
- `supabase/migrations/20251118_profiles.sql`
  - Creates `public.profiles` and DEV RLS policies to allow anon insert/update/select.

## Schema

Table: `public.profiles`

- `id` text primary key (Firebase `uid`)
- `email` text
- `first_name` text
- `created_at` timestamptz default now()
- `updated_at` timestamptz (maintained by trigger)

Trigger: `trg_profiles_updated_at` calls `public.set_updated_at()` on insert/update to maintain `updated_at`.

## Security and RLS

- In development, RLS policies are permissive to allow the browser (anon key) to upsert.
- In production, tighten policies. Options:
  - Proxy Supabase through a server that validates Firebase ID tokens and uses a service key.
  - Or map Firebase JWT → PostgREST role via an auth gateway (advanced setup), then restrict by `profiles.id = request user id`.

DEV policies (see migration) allow anon:

- insert (for upsert)
- update
- select

## Environment

Configure Vite env vars in `.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart the dev server after changes.

## Error Handling

- 404 PGRST205: “Could not find the table …”
  - Run the migration to create `public.profiles`.
- 401/403 on upsert/select:
  - Check RLS policies for `anon` role or route through a secure backend.
- Missing client warning:
  - If `supabase` is `null`, env vars are missing and sync is disabled.

## Applying Migrations

- Open Supabase SQL Editor and paste the contents of `supabase/migrations/20251118_profiles.sql`.
- Or apply via CI/CD using the Supabase CLI in your deployment pipeline.
- After applying, re-login to trigger the profile upsert.

## Future Enhancements

- Extend `profiles` with more fields (e.g., `last_login_at`, `creator_type`).
- Add domain tables (e.g., creator preferences) and reference them by `profiles.id`.
- Replace DEV policies with production-grade authorization (server-side mediation or JWT role mapping).
- Server webhook to sync Firebase profile changes to Supabase.

## Non-goals

- Supabase is not the source of truth for authentication. Firebase Authentication is authoritative.
- Creator onboarding (waitlist, attributes, etc.) is handled by Base44 APIs, not Supabase.
