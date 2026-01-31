-- 0016_package_client_info.sql
-- Add client contact information to talent packages

BEGIN;

ALTER TABLE public.agency_talent_packages 
    ADD COLUMN IF NOT EXISTS client_name text,
    ADD COLUMN IF NOT EXISTS client_email text;

-- Add index for potential CRM integration/lookups
CREATE INDEX IF NOT EXISTS idx_atp_client_email ON public.agency_talent_packages(client_email);

COMMIT;
