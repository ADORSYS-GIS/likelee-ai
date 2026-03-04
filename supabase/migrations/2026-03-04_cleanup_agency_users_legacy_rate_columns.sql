BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'licensing_requests_rate_source_type_check'
  ) THEN
    ALTER TABLE public.licensing_requests
      DROP CONSTRAINT licensing_requests_rate_source_type_check;
  END IF;
END $$;

ALTER TABLE public.licensing_requests
  ADD CONSTRAINT licensing_requests_rate_source_type_check
  CHECK (
    rate_source_type IS NULL
    OR rate_source_type IN ('agency_talent', 'agency_connection', 'creator')
  );

ALTER TABLE IF EXISTS public.agency_users
  DROP CONSTRAINT IF EXISTS agency_users_licensing_rate_weekly_cents_non_negative;

ALTER TABLE IF EXISTS public.agency_users
  DROP COLUMN IF EXISTS licensing_rate_weekly_cents,
  DROP COLUMN IF EXISTS accept_negotiations,
  DROP COLUMN IF EXISTS rate_currency;

COMMIT;
