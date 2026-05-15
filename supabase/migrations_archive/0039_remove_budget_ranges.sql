-- Remove redundant budget range columns from licensing_requests
BEGIN;

ALTER TABLE public.licensing_requests DROP COLUMN IF EXISTS budget_min;
ALTER TABLE public.licensing_requests DROP COLUMN IF EXISTS budget_max;

COMMIT;
