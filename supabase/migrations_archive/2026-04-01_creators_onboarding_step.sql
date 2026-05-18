BEGIN;

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS onboarding_step text;

COMMIT;
