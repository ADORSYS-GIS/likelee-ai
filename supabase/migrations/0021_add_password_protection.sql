-- Adds password_protected flag to talent packages

BEGIN;

ALTER TABLE public.agency_talent_packages
ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE;

COMMIT;
