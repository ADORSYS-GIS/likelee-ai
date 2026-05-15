BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_portal_settings (
  talent_id uuid PRIMARY KEY REFERENCES public.agency_users(id) ON DELETE CASCADE,
  allow_training boolean NOT NULL DEFAULT false,
  public_profile_visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talent_portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "talent_portal_settings select" ON public.talent_portal_settings;
CREATE POLICY "talent_portal_settings select" ON public.talent_portal_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_users au
    WHERE au.id = talent_id
      AND (au.creator_id = auth.uid() OR au.user_id = auth.uid() OR au.agency_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "talent_portal_settings upsert" ON public.talent_portal_settings;
CREATE POLICY "talent_portal_settings upsert" ON public.talent_portal_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_users au
    WHERE au.id = talent_id
      AND (au.creator_id = auth.uid() OR au.user_id = auth.uid() OR au.agency_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_users au
    WHERE au.id = talent_id
      AND (au.creator_id = auth.uid() OR au.user_id = auth.uid() OR au.agency_id = auth.uid())
  )
);

COMMIT;
