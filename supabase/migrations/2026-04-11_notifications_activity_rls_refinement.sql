-- Migration to add missing INSERT/DELETE policies for brand_notifications and DELETE for brand_activity_events
BEGIN;

-- 1. brand_notifications RLS refinements
DROP POLICY IF EXISTS "Brands can read own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can read own notifications" ON public.brand_notifications
  FOR SELECT USING (public.is_brand_team_member(brand_id));

DROP POLICY IF EXISTS "Brands can update read status" ON public.brand_notifications;
CREATE POLICY "Brands can update read status" ON public.brand_notifications
  FOR UPDATE USING (public.is_brand_team_member(brand_id))
  WITH CHECK (public.is_brand_team_member(brand_id));

DROP POLICY IF EXISTS "Brands can insert own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can insert own notifications" ON public.brand_notifications
  FOR INSERT WITH CHECK (public.is_brand_team_member(brand_id));

DROP POLICY IF EXISTS "Brands can delete own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can delete own notifications" ON public.brand_notifications
  FOR DELETE USING (public.is_brand_team_member(brand_id));

-- 2. brand_activity_events RLS refinements
-- Existing table/policies defined in earlier migrations; we add DELETE to support clearing badges/events

DROP POLICY IF EXISTS "Brands can delete own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can delete own activity events" ON public.brand_activity_events
  FOR DELETE USING (public.is_brand_team_member(brand_id));

COMMIT;
