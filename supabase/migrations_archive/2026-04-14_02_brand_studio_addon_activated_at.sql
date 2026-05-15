BEGIN;

-- The brands table was missing studio_addon_activated_at which caused all brand
-- studio-addon DB updates to fail silently (PostgREST rejects unknown columns).
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS studio_addon_activated_at timestamptz;

COMMIT;
