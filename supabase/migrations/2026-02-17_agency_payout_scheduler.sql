BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_payout_settings (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  payout_frequency text NOT NULL DEFAULT 'Monthly' CHECK (payout_frequency IN ('Weekly','Bi-Weekly','Monthly')),
  min_payout_threshold_cents bigint NOT NULL DEFAULT 5000 CHECK (min_payout_threshold_cents >= 0),
  payout_method text NOT NULL DEFAULT 'Stripe Connected Account',
  last_payout_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_payout_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their payout settings" ON public.agency_payout_settings;
CREATE POLICY "Agencies can view their payout settings"
  ON public.agency_payout_settings FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agencies can upsert their payout settings" ON public.agency_payout_settings;
CREATE POLICY "Agencies can upsert their payout settings"
  ON public.agency_payout_settings FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agencies can update their payout settings" ON public.agency_payout_settings;
CREATE POLICY "Agencies can update their payout settings"
  ON public.agency_payout_settings FOR UPDATE USING (auth.uid() = agency_id) WITH CHECK (auth.uid() = agency_id);

COMMIT;
