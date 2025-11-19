-- Add/align profile columns to support full signup payload
-- Safe to run multiple times via IF NOT EXISTS guards

BEGIN;

-- Base identity fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS creator_type text;

-- Location & bio
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS gender text;

-- Arrays of strings
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS content_types text[],
  ADD COLUMN IF NOT EXISTS industries text[],
  ADD COLUMN IF NOT EXISTS work_types text[],
  ADD COLUMN IF NOT EXISTS brand_categories text[],
  ADD COLUMN IF NOT EXISTS ethnicity text[],
  ADD COLUMN IF NOT EXISTS vibes text[];

-- Platform & handles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_platform text,
  ADD COLUMN IF NOT EXISTS platform_handle text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS twitter_handle text;

-- Modeling / talent fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS representation_status text,
  ADD COLUMN IF NOT EXISTS headshot_url text;

-- Athlete fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS athlete_type text,
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS languages text;

-- Visibility & status
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'waitlist';

-- Audit & metadata
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS created_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by_id text,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS is_sample boolean DEFAULT false;

-- Optional content_other free text
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS content_other text;

-- Maintain updated_date automatically on updates
CREATE OR REPLACE FUNCTION set_profiles_updated_date()
RETURNS trigger AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_date ON profiles;
CREATE TRIGGER trg_profiles_set_updated_date
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_profiles_updated_date();

-- Helpful index on email for upserts/finds
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

COMMIT;
