BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_notification_settings (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipients jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_notification_settings select own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings select own" ON public.agency_notification_settings
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_notification_settings insert own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings insert own" ON public.agency_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_notification_settings update own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings update own" ON public.agency_notification_settings
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_notification_settings delete own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings delete own" ON public.agency_notification_settings
  FOR DELETE USING (auth.uid() = agency_id);


CREATE TABLE IF NOT EXISTS public.agency_tax_currency_settings (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  default_currency text NOT NULL DEFAULT 'usd',
  currency_display_format text NOT NULL DEFAULT '1234.56',
  default_tax_rate numeric NOT NULL DEFAULT 0,
  tax_display_name text NOT NULL DEFAULT 'Sales Tax',
  include_tax_in_displayed_prices boolean NOT NULL DEFAULT true,
  default_payment_terms text NOT NULL DEFAULT 'net30',
  late_payment_fee numeric NOT NULL DEFAULT 0,
  invoice_prefix text NOT NULL DEFAULT 'INV-',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_tax_currency_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_tax_currency_settings select own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings select own" ON public.agency_tax_currency_settings
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_tax_currency_settings insert own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings insert own" ON public.agency_tax_currency_settings
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_tax_currency_settings update own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings update own" ON public.agency_tax_currency_settings
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_tax_currency_settings delete own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings delete own" ON public.agency_tax_currency_settings
  FOR DELETE USING (auth.uid() = agency_id);

COMMIT;
