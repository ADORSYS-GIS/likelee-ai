BEGIN;

-- Canonical weekly rates on agency roster talent rows.
ALTER TABLE IF EXISTS public.agency_users
  ADD COLUMN IF NOT EXISTS licensing_rate_weekly_cents bigint,
  ADD COLUMN IF NOT EXISTS accept_negotiations boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS rate_currency text NOT NULL DEFAULT 'USD';

-- Canonical weekly rate on creator public profile.
ALTER TABLE IF EXISTS public.creators
  ADD COLUMN IF NOT EXISTS base_weekly_price_cents bigint;

-- Auditability fields on licensing requests.
ALTER TABLE IF EXISTS public.licensing_requests
  ADD COLUMN IF NOT EXISTS base_rate_weekly_cents bigint,
  ADD COLUMN IF NOT EXISTS offered_rate_weekly_cents bigint,
  ADD COLUMN IF NOT EXISTS rate_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS rate_source_type text,
  ADD COLUMN IF NOT EXISTS rate_source_id text;

-- Constrain known source types.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'licensing_requests_rate_source_type_check'
  ) THEN
    ALTER TABLE public.licensing_requests
      ADD CONSTRAINT licensing_requests_rate_source_type_check
      CHECK (
        rate_source_type IS NULL
        OR rate_source_type IN ('agency_talent', 'creator')
      );
  END IF;
END $$;

-- Constrain non-negative values where present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agency_users_licensing_rate_weekly_cents_non_negative'
  ) THEN
    ALTER TABLE public.agency_users
      ADD CONSTRAINT agency_users_licensing_rate_weekly_cents_non_negative
      CHECK (
        licensing_rate_weekly_cents IS NULL
        OR licensing_rate_weekly_cents >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'creators_base_weekly_price_cents_non_negative'
  ) THEN
    ALTER TABLE public.creators
      ADD CONSTRAINT creators_base_weekly_price_cents_non_negative
      CHECK (
        base_weekly_price_cents IS NULL
        OR base_weekly_price_cents >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'licensing_requests_base_rate_weekly_cents_non_negative'
  ) THEN
    ALTER TABLE public.licensing_requests
      ADD CONSTRAINT licensing_requests_base_rate_weekly_cents_non_negative
      CHECK (
        base_rate_weekly_cents IS NULL
        OR base_rate_weekly_cents >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'licensing_requests_offered_rate_weekly_cents_non_negative'
  ) THEN
    ALTER TABLE public.licensing_requests
      ADD CONSTRAINT licensing_requests_offered_rate_weekly_cents_non_negative
      CHECK (
        offered_rate_weekly_cents IS NULL
        OR offered_rate_weekly_cents >= 0
      );
  END IF;
END $$;

-- Backfill creators weekly values from legacy monthly values when weekly is missing.
UPDATE public.creators
SET base_weekly_price_cents = ROUND(base_monthly_price_cents::numeric / 4.345)::bigint
WHERE base_weekly_price_cents IS NULL
  AND base_monthly_price_cents IS NOT NULL
  AND base_monthly_price_cents > 0;

-- Backfill agency roster weekly values from legacy monthly-like columns if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_users'
      AND column_name = 'licensing_rate_cents'
  ) THEN
    EXECUTE '
      UPDATE public.agency_users
      SET licensing_rate_weekly_cents = ROUND(licensing_rate_cents::numeric / 4.345)::bigint
      WHERE licensing_rate_weekly_cents IS NULL
        AND licensing_rate_cents IS NOT NULL
        AND licensing_rate_cents > 0
    ';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_users'
      AND column_name = 'licensing_rate'
  ) THEN
    -- licensing_rate fallback assumes legacy monthly dollars.
    EXECUTE '
      UPDATE public.agency_users
      SET licensing_rate_weekly_cents = ROUND(((licensing_rate::numeric * 100) / 4.345))::bigint
      WHERE licensing_rate_weekly_cents IS NULL
        AND licensing_rate IS NOT NULL
        AND licensing_rate::numeric > 0
    ';
  END IF;
END $$;

COMMIT;
