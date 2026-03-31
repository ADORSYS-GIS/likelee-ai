-- 2026-03-31_fix_agency_talent_relationships_unique_constraint.sql
-- Fixes ON CONFLICT error in agency roster management by restoring non-partial unique indexes.

BEGIN;

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
