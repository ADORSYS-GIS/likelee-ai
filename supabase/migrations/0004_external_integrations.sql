-- 0005_external_integrations.sql
-- Combined migration for external service integrations (Creatify, etc.)

BEGIN;

-- 1. Creatify tracking columns
ALTER TABLE IF EXISTS public.creators
  ADD COLUMN IF NOT EXISTS creatify_job_id text,
  ADD COLUMN IF NOT EXISTS creatify_job_status text,
  ADD COLUMN IF NOT EXISTS creatify_last_error text,
  ADD COLUMN IF NOT EXISTS creatify_output_url text,
  ADD COLUMN IF NOT EXISTS creatify_avatar_status text;

-- Indexes for Creatify
CREATE INDEX IF NOT EXISTS idx_creators_creatify_job_id ON public.creators (creatify_job_id);
CREATE INDEX IF NOT EXISTS idx_creators_creatify_job_status ON public.creators (creatify_job_status);

-- 2. Legacy/Transition columns
-- Ensure cameo_front_url exists (used to store training video URL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'creators' AND column_name = 'cameo_front_url'
  ) THEN
    ALTER TABLE public.creators ADD COLUMN cameo_front_url text;
  END IF;
END $$;

COMMIT;
