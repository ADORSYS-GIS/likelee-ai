-- 0007_booking_notifications.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  recipient_type text NOT NULL DEFAULT 'talent',
  to_email text,
  subject text,
  message text NOT NULL,
  meta_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_notifications_agency ON public.booking_notifications(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_booking ON public.booking_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_created_at ON public.booking_notifications(created_at);

ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_notifications_rls ON public.booking_notifications;
CREATE POLICY booking_notifications_rls ON public.booking_notifications
  USING (agency_user_id = auth.uid())
  WITH CHECK (agency_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rotate_booking_notifications()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.booking_notifications
  WHERE created_at < (now() - interval '2 days');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_notifications_rotation ON public.booking_notifications;
CREATE TRIGGER booking_notifications_rotation
AFTER INSERT ON public.booking_notifications
FOR EACH STATEMENT EXECUTE FUNCTION public.rotate_booking_notifications();

COMMIT;
