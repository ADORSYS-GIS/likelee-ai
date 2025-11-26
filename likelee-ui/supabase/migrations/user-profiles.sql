-- Consolidated profiles schema (safe to run multiple times)

BEGIN;

-- Ensure gen_random_uuid() exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table if needed with UUID PK
CREATE TABLE IF NOT EXISTS public.profiles (
                                               id uuid PRIMARY KEY DEFAULT gen_random_uuid()
    );

-- If 'id' exists but is not UUID, convert it to UUID with default.
-- This block only sets default if already UUID. If your 'id' is TEXT, use a migration that renames/drops/recreates,
-- otherwise keep this idempotent behavior.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid()';
END IF;
END
$$;

-- Core identity
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email               text,
    ADD COLUMN IF NOT EXISTS full_name           text,
    ADD COLUMN IF NOT EXISTS creator_type        text;

-- Location & bio
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS city                text,
    ADD COLUMN IF NOT EXISTS state               text,
    ADD COLUMN IF NOT EXISTS birthdate           date,
    ADD COLUMN IF NOT EXISTS bio                 text,
    ADD COLUMN IF NOT EXISTS gender              text;

-- Arrays
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS content_types       text[],
    ADD COLUMN IF NOT EXISTS industries          text[],
    ADD COLUMN IF NOT EXISTS work_types          text[],
    ADD COLUMN IF NOT EXISTS brand_categories    text[],
    ADD COLUMN IF NOT EXISTS ethnicity           text[],
    ADD COLUMN IF NOT EXISTS vibes               text[];

-- Platforms & handles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS primary_platform    text,
    ADD COLUMN IF NOT EXISTS platform_handle     text,
    ADD COLUMN IF NOT EXISTS instagram_handle    text,
    ADD COLUMN IF NOT EXISTS twitter_handle      text;

-- Modeling / talent
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS representation_status text,
    ADD COLUMN IF NOT EXISTS headshot_url          text;

-- Athlete
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS sport              text,
    ADD COLUMN IF NOT EXISTS athlete_type       text,
    ADD COLUMN IF NOT EXISTS school_name        text,
    ADD COLUMN IF NOT EXISTS age                integer,
    ADD COLUMN IF NOT EXISTS languages          text;

-- Verification with checks
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS kyc_status        text,
    ADD COLUMN IF NOT EXISTS liveness_status   text,
    ADD COLUMN IF NOT EXISTS kyc_provider      text,
    ADD COLUMN IF NOT EXISTS kyc_session_id    text,
    ADD COLUMN IF NOT EXISTS verified_at       timestamptz;

-- Add/refresh enum-like checks idempotently
DO $$
BEGIN
  -- Drop and recreate constraints for consistency (only if they exist with different definitions)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_kyc_status_check'
  ) THEN
ALTER TABLE public.profiles DROP CONSTRAINT profiles_kyc_status_check;
END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_liveness_status_check'
  ) THEN
ALTER TABLE public.profiles DROP CONSTRAINT profiles_liveness_status_check;
END IF;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_kyc_status_check
        CHECK (kyc_status IN ('not_started','pending','approved','rejected')),
    ADD CONSTRAINT profiles_liveness_status_check
      CHECK (liveness_status IN ('not_started','pending','approved','rejected'));

-- Set defaults if missing
EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN kyc_status SET DEFAULT ''not_started''';
EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN liveness_status SET DEFAULT ''not_started''';
END
$$;

-- Visibility & status
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS visibility         text DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS status             text DEFAULT 'waitlist';

-- Audit & metadata
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS created_date       timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_date       timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by_id      text,
    ADD COLUMN IF NOT EXISTS created_by         text,
    ADD COLUMN IF NOT EXISTS is_sample          boolean DEFAULT false;

-- Optional content_other
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS content_other      text;

-- Media
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS avatar_canonical_url text,
    ADD COLUMN IF NOT EXISTS cameo_front_url      text,
    ADD COLUMN IF NOT EXISTS cameo_left_url       text,
    ADD COLUMN IF NOT EXISTS cameo_right_url      text;

-- Legacy timestamps from earliest migration (keep if present)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS created_at         timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at         timestamptz;

-- Update trigger for updated_date
CREATE OR REPLACE FUNCTION set_profiles_updated_date()
RETURNS trigger AS $$
BEGIN
  NEW.updated_date = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_date ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_date
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION set_profiles_updated_date();

-- Helpful index on email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- RLS and DEV policies (adjust for production)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old dev policies before recreating
DROP POLICY IF EXISTS "profiles anon insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles anon update" ON public.profiles;
DROP POLICY IF EXISTS "profiles anon select" ON public.profiles;

CREATE POLICY "profiles anon insert"
  ON public.profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "profiles anon update"
  ON public.profiles
  FOR UPDATE
                                       TO anon
                                       USING (true)
      WITH CHECK (true);

CREATE POLICY "profiles anon select"
  ON public.profiles
  FOR SELECT
                 TO anon
                 USING (true);

COMMIT;