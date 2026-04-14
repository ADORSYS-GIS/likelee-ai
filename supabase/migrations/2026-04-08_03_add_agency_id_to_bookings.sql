-- Migration: Add agency_id to bookings for team member RLS support
-- Issue: bookings table uses agency_user_id (owner's user ID) but team members
-- need to access bookings via organization_memberships which checks agency_id
-- Solution: Add agency_id column and update RLS policies

BEGIN;

-- Add agency_id column to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Backfill agency_id from agency_user_id for legacy rows
-- For agencies, the owner's user ID equals the agency ID
UPDATE public.bookings
SET agency_id = agency_user_id
WHERE agency_id IS NULL AND agency_user_id IN (SELECT id FROM public.agencies);

-- Create index for agency_id lookups
CREATE INDEX IF NOT EXISTS idx_bookings_agency_id ON public.bookings(agency_id);

-- Update RLS policies to support team member access
DROP POLICY IF EXISTS "bookings select own" ON public.bookings;
CREATE POLICY "bookings select own" ON public.bookings
  FOR SELECT USING (
    public.is_agency_team_member(agency_id)
    OR auth.uid() = agency_user_id
  );

DROP POLICY IF EXISTS "bookings insert own" ON public.bookings;
CREATE POLICY "bookings insert own" ON public.bookings
  FOR INSERT WITH CHECK (
    public.is_agency_team_member(agency_id)
    OR auth.uid() = agency_user_id
  );

DROP POLICY IF EXISTS "bookings update own" ON public.bookings;
CREATE POLICY "bookings update own" ON public.bookings
  FOR UPDATE USING (
    public.is_agency_team_member(agency_id)
    OR auth.uid() = agency_user_id
  );

DROP POLICY IF EXISTS "bookings delete own" ON public.bookings;
CREATE POLICY "bookings delete own" ON public.bookings
  FOR DELETE USING (
    public.is_agency_team_member(agency_id)
    OR auth.uid() = agency_user_id
  );

COMMIT;
