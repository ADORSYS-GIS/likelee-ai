BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'email',
  from_label text,
  subject text,
  message text NOT NULL,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_notifications_talent_created
  ON public.talent_notifications (talent_user_id, created_at DESC);

ALTER TABLE public.talent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Talents can read own notifications" ON public.talent_notifications;
CREATE POLICY "Talents can read own notifications" ON public.talent_notifications
FOR SELECT
USING (talent_user_id = auth.uid());

DROP POLICY IF EXISTS "Talents can update read status" ON public.talent_notifications;
CREATE POLICY "Talents can update read status" ON public.talent_notifications
FOR UPDATE
USING (talent_user_id = auth.uid())
WITH CHECK (talent_user_id = auth.uid());

COMMIT;