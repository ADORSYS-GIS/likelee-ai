BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_booking_preferences (
  talent_id uuid PRIMARY KEY REFERENCES public.agency_users(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  willing_to_travel boolean NOT NULL DEFAULT false,
  min_day_rate_cents integer,
  currency text NOT NULL DEFAULT 'USD',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_booking_preferences_agency_id
  ON public.talent_booking_preferences (agency_id);

ALTER TABLE public.talent_booking_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view booking preferences" ON public.talent_booking_preferences;
CREATE POLICY "Agencies can view booking preferences" ON public.talent_booking_preferences
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage booking preferences" ON public.talent_booking_preferences;
CREATE POLICY "Agencies can manage booking preferences" ON public.talent_booking_preferences
FOR ALL
USING (agency_id = auth.uid())
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Talents can view their booking preferences" ON public.talent_booking_preferences;
CREATE POLICY "Talents can view their booking preferences" ON public.talent_booking_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Talents can manage their booking preferences" ON public.talent_booking_preferences;
CREATE POLICY "Talents can manage their booking preferences" ON public.talent_booking_preferences
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
);

COMMIT;
