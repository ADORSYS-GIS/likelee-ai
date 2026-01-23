-- 0008_scouting_offers_and_templates.sql
-- DocuSeal Integration: Templates and Offers Management

BEGIN;

-- 1. Scouting Templates (DocuSeal Integration)
CREATE TABLE IF NOT EXISTS public.scouting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  -- DocuSeal Integration
  docuseal_template_id integer NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: Each agency can have maximum 2 templates
  CONSTRAINT unique_agency_template UNIQUE (agency_id, docuseal_template_id)
);

-- Index for agency templates lookup
CREATE INDEX IF NOT EXISTS idx_scouting_templates_agency_id 
  ON public.scouting_templates(agency_id);

-- Function to enforce 2-template limit per agency
CREATE OR REPLACE FUNCTION check_template_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.scouting_templates WHERE agency_id = NEW.agency_id) >= 2 THEN
    RAISE EXCEPTION 'Agency cannot have more than 2 templates';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce template limit
DROP TRIGGER IF EXISTS enforce_template_limit ON public.scouting_templates;
CREATE TRIGGER enforce_template_limit
  BEFORE INSERT ON public.scouting_templates
  FOR EACH ROW
  EXECUTE FUNCTION check_template_limit();

-- 2. Scouting Offers (DocuSeal Submissions)
CREATE TABLE IF NOT EXISTS public.scouting_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.scouting_prospects(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.scouting_templates(id) ON DELETE RESTRICT,
  
  -- DocuSeal Integration
  docuseal_submission_id integer UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, signed, declined, voided
  signing_url text,
  signed_document_url text,
  
  -- Timestamps
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure prospect belongs to the same agency
  CONSTRAINT fk_agency_prospect CHECK (
    agency_id = (SELECT agency_id FROM public.scouting_prospects WHERE id = prospect_id)
  )
);

-- Indexes for offers
CREATE INDEX IF NOT EXISTS idx_scouting_offers_agency_id 
  ON public.scouting_offers(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_prospect_id 
  ON public.scouting_offers(prospect_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_template_id 
  ON public.scouting_offers(template_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_status 
  ON public.scouting_offers(status);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_docuseal_submission_id 
  ON public.scouting_offers(docuseal_submission_id);

-- RLS Policies
ALTER TABLE public.scouting_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_offers ENABLE ROW LEVEL SECURITY;

-- Templates Policies
DROP POLICY IF EXISTS "Agency members can select templates" ON public.scouting_templates;
CREATE POLICY "Agency members can select templates" ON public.scouting_templates
  FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can insert templates" ON public.scouting_templates;
CREATE POLICY "Agency members can insert templates" ON public.scouting_templates
  FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can update templates" ON public.scouting_templates;
CREATE POLICY "Agency members can update templates" ON public.scouting_templates
  FOR UPDATE USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can delete templates" ON public.scouting_templates;
CREATE POLICY "Agency members can delete templates" ON public.scouting_templates
  FOR DELETE USING (agency_id = auth.uid());

-- Offers Policies
DROP POLICY IF EXISTS "Agency members can select offers" ON public.scouting_offers;
CREATE POLICY "Agency members can select offers" ON public.scouting_offers
  FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can insert offers" ON public.scouting_offers;
CREATE POLICY "Agency members can insert offers" ON public.scouting_offers
  FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can update offers" ON public.scouting_offers;
CREATE POLICY "Agency members can update offers" ON public.scouting_offers
  FOR UPDATE USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can delete offers" ON public.scouting_offers;
CREATE POLICY "Agency members can delete offers" ON public.scouting_offers
  FOR DELETE USING (agency_id = auth.uid());

COMMIT;
