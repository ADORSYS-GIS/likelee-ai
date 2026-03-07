-- 2026-03-07_add_package_meta.sql
-- Add metadata column to agency_talent_packages for extensible flags like wizard_source

BEGIN;

ALTER TABLE public.agency_talent_packages 
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Optional: Index on meta for performance if needed later
CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_meta ON public.agency_talent_packages USING gin (meta);

COMMIT;
