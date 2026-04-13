-- Migration: Fix RLS policies for agency_clients to support team members
-- Issue: agency_clients RLS policies were checking auth.uid() = agency_id
-- which fails for team members who have their own user IDs.
-- Fix: Use is_agency_team_member() helper function

BEGIN;

-- ============================================================================
-- agency_clients: Update policies for team member access
-- ============================================================================

-- Allow any agency team member to view clients
DROP POLICY IF EXISTS "agency_clients select own" ON public.agency_clients;
CREATE POLICY "agency_clients select own"
  ON public.agency_clients FOR SELECT
  USING (public.is_agency_team_member(agency_id));

-- Allow any agency team member to insert clients
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "agency_clients insert own" ON public.agency_clients;
CREATE POLICY "agency_clients insert own"
  ON public.agency_clients FOR INSERT
  WITH CHECK (public.is_agency_team_member(agency_id));

-- Allow any agency team member to update clients
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "agency_clients update own" ON public.agency_clients;
CREATE POLICY "agency_clients update own"
  ON public.agency_clients FOR UPDATE
  USING (public.is_agency_team_member(agency_id))
  WITH CHECK (public.is_agency_team_member(agency_id));

-- Allow any agency team member to delete clients
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "agency_clients delete own" ON public.agency_clients;
CREATE POLICY "agency_clients delete own"
  ON public.agency_clients FOR DELETE
  USING (public.is_agency_team_member(agency_id));

COMMIT;
