-- Add per-profile Creatify avatar reference
BEGIN;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS creatify_avatar_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_creatify_avatar_id ON public.profiles (creatify_avatar_id);

COMMIT;
