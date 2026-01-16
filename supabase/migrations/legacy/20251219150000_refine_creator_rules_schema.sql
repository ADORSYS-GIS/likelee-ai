BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS content_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}';

COMMIT;
