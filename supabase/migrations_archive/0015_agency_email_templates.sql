BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_agency_email_templates_agency_id ON public.agency_email_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_email_templates_is_active ON public.agency_email_templates(is_active);

ALTER TABLE public.agency_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_email_templates select own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates select own" ON public.agency_email_templates
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_email_templates insert own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates insert own" ON public.agency_email_templates
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_email_templates update own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates update own" ON public.agency_email_templates
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_email_templates delete own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates delete own" ON public.agency_email_templates
  FOR DELETE USING (auth.uid() = agency_id);

COMMIT;
 