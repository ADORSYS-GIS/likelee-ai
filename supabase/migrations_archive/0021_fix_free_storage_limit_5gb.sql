BEGIN;

-- Ensure Free plan storage limit is 5GB for both new and existing rows.
-- (Some agencies may still have the older 10GB default persisted.)

ALTER TABLE public.agency_storage_settings
  ALTER COLUMN storage_limit_bytes SET DEFAULT 5368709120;

UPDATE public.agency_storage_settings
SET storage_limit_bytes = 5368709120,
    updated_at = now()
WHERE storage_limit_bytes = 10737418240;

COMMIT;
