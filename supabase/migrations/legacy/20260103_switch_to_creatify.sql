-- Switch from Tavus to Creatify: remove Tavus columns, add Creatify columns
-- Idempotent-safe where possible

BEGIN;

-- Drop Tavus columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='tavus_avatar_id'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN tavus_avatar_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='tavus_avatar_status'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN tavus_avatar_status;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='tavus_last_error'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN tavus_last_error;
  END IF;
END$$;

-- Add Creatify tracking columns
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS creatify_job_id text,
  ADD COLUMN IF NOT EXISTS creatify_job_status text,
  ADD COLUMN IF NOT EXISTS creatify_last_error text,
  ADD COLUMN IF NOT EXISTS creatify_output_url text;

-- Indexes for Creatify
CREATE INDEX IF NOT EXISTS idx_profiles_creatify_job_id ON public.profiles (creatify_job_id);
CREATE INDEX IF NOT EXISTS idx_profiles_creatify_job_status ON public.profiles (creatify_job_status);

COMMIT;
