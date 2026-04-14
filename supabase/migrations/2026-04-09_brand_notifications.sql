BEGIN;

CREATE TABLE IF NOT EXISTS public.brand_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'email',
  from_label text,
  subject text,
  message text NOT NULL,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_notifications_brand_created
  ON public.brand_notifications (brand_id, created_at DESC);

ALTER TABLE public.brand_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can read own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can read own notifications" ON public.brand_notifications
FOR SELECT
USING (public.is_brand_team_member(brand_id));

DROP POLICY IF EXISTS "Brands can update read status" ON public.brand_notifications;
CREATE POLICY "Brands can update read status" ON public.brand_notifications
FOR UPDATE
USING (public.is_brand_team_member(brand_id))
WITH CHECK (public.is_brand_team_member(brand_id));

DROP POLICY IF EXISTS "Brands can insert own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can insert own notifications" ON public.brand_notifications
FOR INSERT
WITH CHECK (public.is_brand_team_member(brand_id));

DROP POLICY IF EXISTS "Brands can delete own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can delete own notifications" ON public.brand_notifications
FOR DELETE
USING (public.is_brand_team_member(brand_id));

-- brand_activity_events RLS refinements
-- Existing table/policies defined in earlier migrations; add DELETE to support clearing badges/events
DROP POLICY IF EXISTS "Brands can delete own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can delete own activity events" ON public.brand_activity_events
FOR DELETE
USING (public.is_brand_team_member(brand_id));

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{"newProjectAlerts": true, "deliverableSubmissions": true, "approvalReminders": true, "licenseExpirationAlerts": true, "monthlyAnalyticsSummary": false}'::jsonb;

COMMIT;
