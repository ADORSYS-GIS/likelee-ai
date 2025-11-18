-- Migration: create profiles table and dev RLS policies
-- Description: Minimal user profile mirror for Firebase users, upserted from the web app
-- Safe to re-run: Yes (idempotent via IF EXISTS/IF NOT EXISTS and DROP ... IF EXISTS)

-- 1) Table
CREATE TABLE IF NOT EXISTS public.profiles (
                                               id TEXT PRIMARY KEY,
                                               email TEXT,
                                               first_name TEXT,
                                               created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
    );

-- 2) Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE INSERT OR UPDATE ON public.profiles
                         FOR EACH ROW
                         EXECUTE FUNCTION public.set_updated_at();

-- 3) RLS and policies (DEV): allow anon insert/update/select
-- Note: For production, replace these with stricter policies.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist so this migration is idempotent
DROP POLICY IF EXISTS "profiles anon insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles anon update" ON public.profiles;
DROP POLICY IF EXISTS "profiles anon select" ON public.profiles;

-- INSERT policy: only WITH CHECK is allowed (no USING)
CREATE POLICY "profiles anon insert"
  ON public.profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE policy: USING (for visibility) and WITH CHECK (for allowed new values)
CREATE POLICY "profiles anon update"
  ON public.profiles
  FOR UPDATE
                                       TO anon
                                       USING (true)
      WITH CHECK (true);

-- SELECT policy: USING controls which rows are visible
CREATE POLICY "profiles anon select"
  ON public.profiles
  FOR SELECT
                 TO anon
                 USING (true);
