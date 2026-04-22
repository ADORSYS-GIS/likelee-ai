-- Migration: Fix RLS policies for team members to access connection requests, licenses and files
-- Added: 2026-04-15

BEGIN;

-- 1. Fix RLS for brand_agency_connection_requests
DROP POLICY IF EXISTS "Agencies can view brand connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Agencies can view brand connection requests"
  ON public.brand_agency_connection_requests
  FOR SELECT
  USING (public.is_agency_team_member(agency_id));

-- 2. Fix RLS for brand_license_requests
DROP POLICY IF EXISTS "Agencies can view assigned brand license requests" ON public.brand_license_requests;
CREATE POLICY "Agencies can view assigned brand license requests"
  ON public.brand_license_requests FOR SELECT
  USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "Agencies can update assigned brand license requests" ON public.brand_license_requests;
CREATE POLICY "Agencies can update assigned brand license requests"
  ON public.brand_license_requests FOR UPDATE
  USING (public.is_agency_team_member(agency_id));

-- 3. Fix RLS for agency_files
DROP POLICY IF EXISTS "agency_files select own" ON public.agency_files;
CREATE POLICY "agency_files select own" ON public.agency_files
  FOR SELECT USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_files insert own" ON public.agency_files;
CREATE POLICY "agency_files insert own" ON public.agency_files
  FOR INSERT WITH CHECK (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_files update own" ON public.agency_files;
CREATE POLICY "agency_files update own" ON public.agency_files
  FOR UPDATE USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_files delete own" ON public.agency_files;
CREATE POLICY "agency_files delete own" ON public.agency_files
  FOR DELETE USING (public.is_agency_team_member(agency_id));

-- 4. Allow agencies to view brand profiles they are connected to
DROP POLICY IF EXISTS "Agencies can view connected brand profiles" ON public.brands;
CREATE POLICY "Agencies can view connected brand profiles" ON public.brands
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brand_agency_connections bac
      WHERE bac.brand_id = public.brands.id
        AND bac.status = 'active'
        AND public.is_agency_team_member(bac.agency_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.brand_agency_connection_requests bacr
      WHERE bacr.brand_id = public.brands.id
        AND public.is_agency_team_member(bacr.agency_id)
    )
  );

COMMIT;
