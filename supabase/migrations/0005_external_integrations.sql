-- 0005_external_integrations.sql
-- Combined migration for external service integrations (Creatify, etc.)

BEGIN;

-- 1. Creatify tracking columns
ALTER TABLE IF EXISTS public.creators
  ADD COLUMN IF NOT EXISTS creatify_job_id text,
  ADD COLUMN IF NOT EXISTS creatify_job_status text,
  ADD COLUMN IF NOT EXISTS creatify_last_error text,
  ADD COLUMN IF NOT EXISTS creatify_output_url text,
  ADD COLUMN IF NOT EXISTS creatify_avatar_status text;

-- Indexes for Creatify
CREATE INDEX IF NOT EXISTS idx_creators_creatify_job_id ON public.creators (creatify_job_id);
CREATE INDEX IF NOT EXISTS idx_creators_creatify_job_status ON public.creators (creatify_job_status);

-- 2. Legacy/Transition columns
-- Ensure cameo_front_url exists (used to store training video URL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'creators' AND column_name = 'cameo_front_url'
  ) THEN
    ALTER TABLE public.creators ADD COLUMN cameo_front_url text;
  END IF;
END $$;

-- 3. Scouting contracts (DocuSeal)
-- Ensure templates table exists
CREATE TABLE IF NOT EXISTS public.scouting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  docuseal_template_id integer NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_templates_agency ON public.scouting_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_templates_docuseal_id ON public.scouting_templates(docuseal_template_id);

ALTER TABLE public.scouting_templates ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='scouting_templates' AND policyname='agency members all scouting_templates'
  ) THEN
    CREATE POLICY "agency members all scouting_templates" ON public.scouting_templates
      FOR ALL USING (agency_id = auth.uid());
  END IF;
END$$;

-- Ensure offers table exists
CREATE TABLE IF NOT EXISTS public.scouting_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  prospect_id uuid NOT NULL REFERENCES public.scouting_prospects(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.scouting_templates(id) ON DELETE RESTRICT,
  docuseal_submission_id integer,
  -- Immutable snapshot of the document name at time of submission
  document_name text,
  status text NOT NULL DEFAULT 'sent', -- sent, completed/signed, declined, voided
  signing_url text,
  signed_document_url text,
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill-safe column adds
ALTER TABLE IF EXISTS public.scouting_offers
  ADD COLUMN IF NOT EXISTS document_name text,
  ADD COLUMN IF NOT EXISTS docuseal_submission_id integer,
  ADD COLUMN IF NOT EXISTS signing_url text,
  ADD COLUMN IF NOT EXISTS signed_document_url text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_scouting_offers_agency ON public.scouting_offers(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_prospect ON public.scouting_offers(prospect_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_template ON public.scouting_offers(template_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_status ON public.scouting_offers(status);

ALTER TABLE public.scouting_offers ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='scouting_offers' AND policyname='agency members all scouting_offers'
  ) THEN
    CREATE POLICY "agency members all scouting_offers" ON public.scouting_offers
      FOR ALL USING (agency_id = auth.uid());
  END IF;
END$$;

-- Backfill existing offers' document_name from template name where missing
UPDATE public.scouting_offers so
SET document_name = st.name
FROM public.scouting_templates st
WHERE so.template_id = st.id
  AND (so.document_name IS NULL OR so.document_name = '');

-- Immutable snapshot: set document_name automatically on INSERT if null
CREATE OR REPLACE FUNCTION public.set_scouting_offer_document_name()
RETURNS trigger AS $$
BEGIN
  IF NEW.document_name IS NULL OR NEW.document_name = '' THEN
    SELECT name INTO NEW.document_name FROM public.scouting_templates WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_scouting_offer_document_name'
  ) THEN
    CREATE TRIGGER trg_set_scouting_offer_document_name
      BEFORE INSERT ON public.scouting_offers
      FOR EACH ROW EXECUTE FUNCTION public.set_scouting_offer_document_name();
  END IF;
END $$;

-- Prevent changing document_name after insert (keep original value)
CREATE OR REPLACE FUNCTION public.lock_scouting_offer_document_name()
RETURNS trigger AS $$
BEGIN
  NEW.document_name := OLD.document_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lock_scouting_offer_document_name'
  ) THEN
    CREATE TRIGGER trg_lock_scouting_offer_document_name
      BEFORE UPDATE OF document_name ON public.scouting_offers
      FOR EACH ROW EXECUTE FUNCTION public.lock_scouting_offer_document_name();
  END IF;
END $$;

-- 4. Creator profile social links
ALTER TABLE IF EXISTS public.creators
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS portfolio_link text;

COMMIT;
