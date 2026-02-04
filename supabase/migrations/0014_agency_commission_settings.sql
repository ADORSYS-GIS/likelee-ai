BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_commission_settings (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  default_commission_bps integer NOT NULL DEFAULT 2000,
  division_commissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_commission_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_commission_settings select own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings select own" ON public.agency_commission_settings
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_commission_settings insert own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings insert own" ON public.agency_commission_settings
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_commission_settings update own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings update own" ON public.agency_commission_settings
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_commission_settings delete own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings delete own" ON public.agency_commission_settings
  FOR DELETE USING (auth.uid() = agency_id);

COMMIT;
