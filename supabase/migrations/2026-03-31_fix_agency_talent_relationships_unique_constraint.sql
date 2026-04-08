-- 2026-03-31_fix_agency_talent_relationships_unique_constraint.sql
-- Fixes ON CONFLICT error in agency roster management by restoring non-partial unique indexes.

BEGIN;

-- Rename weekly licensing rate columns to monthly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_talent_relationships'
      AND column_name = 'licensing_rate_weekly_cents'
  ) THEN
    ALTER TABLE public.agency_talent_relationships
      RENAME COLUMN licensing_rate_weekly_cents TO licensing_rate_monthly_cents;

  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_talent_relationships'
      AND column_name = 'licensing_rate_monthly_cents'
  ) THEN
    ALTER TABLE public.agency_talent_relationships
      ADD COLUMN licensing_rate_monthly_cents bigint;

    ALTER TABLE public.agency_talent_relationships
      DROP CONSTRAINT IF EXISTS agency_talent_relationships_licensing_rate_non_negative;
    ALTER TABLE public.agency_talent_relationships
      ADD CONSTRAINT agency_talent_relationships_licensing_rate_non_negative
      CHECK (
        licensing_rate_monthly_cents IS NULL
        OR licensing_rate_monthly_cents >= 0
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_users'
      AND column_name = 'licensing_rate_weekly_cents'
  ) THEN
    ALTER TABLE public.agency_users
      RENAME COLUMN licensing_rate_weekly_cents TO licensing_rate_monthly_cents;

  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_users'
      AND column_name = 'licensing_rate_monthly_cents'
  ) THEN
    ALTER TABLE public.agency_users
      ADD COLUMN licensing_rate_monthly_cents bigint;

    ALTER TABLE public.agency_users
      DROP CONSTRAINT IF EXISTS agency_users_licensing_rate_weekly_cents_non_negative;
    ALTER TABLE public.agency_users
      DROP CONSTRAINT IF EXISTS agency_users_licensing_rate_monthly_cents_non_negative;
    ALTER TABLE public.agency_users
      ADD CONSTRAINT agency_users_licensing_rate_monthly_cents_non_negative
      CHECK (
        licensing_rate_monthly_cents IS NULL
        OR licensing_rate_monthly_cents >= 0
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'licensing_requests'
      AND column_name = 'base_rate_weekly_cents'
  ) THEN
    ALTER TABLE public.licensing_requests
      RENAME COLUMN base_rate_weekly_cents TO base_rate_monthly_cents;

    ALTER TABLE public.licensing_requests
      DROP CONSTRAINT IF EXISTS licensing_requests_base_rate_weekly_cents_non_negative;
    ALTER TABLE public.licensing_requests
      DROP CONSTRAINT IF EXISTS licensing_requests_base_rate_monthly_cents_non_negative;
    ALTER TABLE public.licensing_requests
      ADD CONSTRAINT licensing_requests_base_rate_monthly_cents_non_negative
      CHECK (
        base_rate_monthly_cents IS NULL
        OR base_rate_monthly_cents >= 0
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'licensing_requests'
      AND column_name = 'offered_rate_weekly_cents'
  ) THEN
    ALTER TABLE public.licensing_requests
      RENAME COLUMN offered_rate_weekly_cents TO offered_rate_monthly_cents;

    ALTER TABLE public.licensing_requests
      DROP CONSTRAINT IF EXISTS licensing_requests_offered_rate_weekly_cents_non_negative;
    ALTER TABLE public.licensing_requests
      DROP CONSTRAINT IF EXISTS licensing_requests_offered_rate_monthly_cents_non_negative;
    ALTER TABLE public.licensing_requests
      ADD CONSTRAINT licensing_requests_offered_rate_monthly_cents_non_negative
      CHECK (
        offered_rate_monthly_cents IS NULL
        OR offered_rate_monthly_cents >= 0
      );
  END IF;
END $$;

-- Drop the partial index that prevents standard ON CONFLICT targeting
DROP INDEX IF EXISTS public.uq_agency_talent_relationships_agency_talent;

-- Create a standard non-partial UNIQUE INDEX on (agency_id, talent_id).
-- Standard unique indexes in Postgres allow multiple NULL values for talent_id,
-- while enforcing uniqueness for non-NULL talent_id values.
-- This matches the standard ON CONFLICT (agency_id, talent_id) specification.
CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_talent_relationships_agency_talent
  ON public.agency_talent_relationships(agency_id, talent_id);

-- Also restore the (agency_id, creator_id) unique index to be non-partial for consistency.
DROP INDEX IF EXISTS public.uq_agency_talent_relationships_agency_creator;
CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_talent_relationships_agency_creator
  ON public.agency_talent_relationships(agency_id, creator_id);

-- Fix offer_talent_assignments partial index as well
DROP INDEX IF EXISTS public.uq_offer_talent_assignments_offer_talent;
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_talent_assignments_offer_talent
  ON public.offer_talent_assignments(offer_id, talent_id);

COMMIT;
