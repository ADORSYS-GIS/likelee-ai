-- 0011_invoice_reminders.sql
BEGIN;

-- Persist invoice attachment HTML for resend/reminders (snapshot of what was sent)
ALTER TABLE public.agency_invoices
  ADD COLUMN IF NOT EXISTS attachment_html text;

-- Agency-level reminder toggles
CREATE TABLE IF NOT EXISTS public.agency_invoice_reminder_settings (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  enabled_3_days_before boolean NOT NULL DEFAULT true,
  enabled_on_due_date boolean NOT NULL DEFAULT true,
  enabled_7_days_after boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_invoice_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_reminder_settings select own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings select own" ON public.agency_invoice_reminder_settings
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_settings insert own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings insert own" ON public.agency_invoice_reminder_settings
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_settings update own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings update own" ON public.agency_invoice_reminder_settings
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_settings delete own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings delete own" ON public.agency_invoice_reminder_settings
  FOR DELETE USING (auth.uid() = agency_id);

-- Reminder delivery log (idempotency + audit)
CREATE TABLE IF NOT EXISTS public.agency_invoice_reminder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.agency_invoices(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('before_3_days','on_due_date','after_7_days')),
  scheduled_for date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  to_email text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  error text,
  UNIQUE (invoice_id, reminder_type, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_agency_invoice_reminder_events_agency_id
  ON public.agency_invoice_reminder_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invoice_reminder_events_invoice_id
  ON public.agency_invoice_reminder_events(invoice_id);

ALTER TABLE public.agency_invoice_reminder_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_reminder_events select own" ON public.agency_invoice_reminder_events;
CREATE POLICY "agency_invoice_reminder_events select own" ON public.agency_invoice_reminder_events
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_events insert own" ON public.agency_invoice_reminder_events;
CREATE POLICY "agency_invoice_reminder_events insert own" ON public.agency_invoice_reminder_events
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

COMMIT;
