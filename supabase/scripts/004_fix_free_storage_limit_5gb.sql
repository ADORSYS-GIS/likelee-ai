BEGIN;
UPDATE public.agency_storage_settings
SET storage_limit_bytes = 5368709120,
    updated_at = now()
WHERE storage_limit_bytes = 10737418240;
COMMIT;
