-- Migration to fix RLS and ordering for brand analytics follow-ups
BEGIN;

-- 1. Fix RLS for brand_activity_events
-- Agencies and Creators involved in a campaign should also be able to see relevant activity events
-- This policy allows access if the user is the brand OR is linked via brand_agency_connections/brand_creator_connections

DROP POLICY IF EXISTS "Brands can view own activity events" ON public.brand_activity_events;

CREATE POLICY "Users can view relevant activity events"
  ON public.brand_activity_events FOR SELECT
  USING (
    brand_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.brand_agency_connections 
      WHERE brand_id = public.brand_activity_events.brand_id AND agency_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.brand_creator_connections 
      WHERE brand_id = public.brand_activity_events.brand_id AND creator_id = auth.uid()
    )
  );

COMMIT;
