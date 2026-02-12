BEGIN;

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS public_profile_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_creators_public_profile_visible
  ON public.creators(public_profile_visible);

COMMIT;
