-- License Submissions and External Client Workflow with true idempotency
BEGIN;

-- 1. Create license_submissions table
CREATE TABLE IF NOT EXISTS public.license_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.agency_clients(id) ON DELETE CASCADE;
ALTER TABLE public.license_submissions ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS template_id UUID NOT NULL REFERENCES public.license_templates(id) ON DELETE CASCADE;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS licensing_request_id UUID REFERENCES public.licensing_requests(id) ON DELETE SET NULL;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS docuseal_submission_id INTEGER;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS docuseal_slug TEXT;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS docuseal_template_id INTEGER;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS talent_names TEXT; -- Support multi-talent comma separated
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS license_fee BIGINT;

-- 2. Consolidate legacy fee columns into license_fee
DO $$ 
BEGIN
    -- Migrate from price if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_submissions' AND column_name='price') THEN
        UPDATE public.license_submissions SET license_fee = price WHERE license_fee IS NULL;
        ALTER TABLE public.license_submissions DROP COLUMN price;
    END IF;
END $$;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS custom_terms TEXT;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'opened', 'signed', 'declined', 'archived', 'completed'));
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.license_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add indexes for license_submissions
CREATE INDEX IF NOT EXISTS idx_license_submissions_agency ON public.license_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_client ON public.license_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_template ON public.license_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_docuseal ON public.license_submissions(docuseal_submission_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_ds_template ON public.license_submissions(docuseal_template_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_lr ON public.license_submissions(licensing_request_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_status ON public.license_submissions(status);

-- 3. Modify license_templates table (Further refinements)
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS docuseal_template_id INTEGER;
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS talent_name TEXT;
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS start_date DATE;

-- Support legacy column if start_date was TEXT
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_templates' AND column_name='start_date' AND data_type='text') THEN
        ALTER TABLE public.license_templates ALTER COLUMN start_date TYPE DATE USING start_date::DATE;
    END IF;
END $$;

-- 4. Modify licensing_requests table
ALTER TABLE public.licensing_requests ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES public.license_submissions(id) ON DELETE SET NULL;
ALTER TABLE public.licensing_requests ADD COLUMN IF NOT EXISTS talent_name TEXT;
ALTER TABLE public.licensing_requests ALTER COLUMN talent_id DROP NOT NULL;
ALTER TABLE public.licensing_requests ALTER COLUMN brand_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_licensing_requests_submission ON public.licensing_requests(submission_id);

-- 5. RLS Policies for license_submissions
ALTER TABLE public.license_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'license_submissions' AND policyname = 'Agencies can view their own submissions') THEN
        CREATE POLICY "Agencies can view their own submissions" ON public.license_submissions
            FOR SELECT USING (agency_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'license_submissions' AND policyname = 'Agencies can manage their own submissions') THEN
        CREATE POLICY "Agencies can manage their own submissions" ON public.license_submissions
            FOR ALL USING (agency_id = auth.uid());
    END IF;
END $$;

-- 6. Add updated_at trigger for license_submissions
CREATE OR REPLACE FUNCTION update_license_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_license_submissions_updated_at ON public.license_submissions;
CREATE TRIGGER trigger_license_submissions_updated_at
    BEFORE UPDATE ON public.license_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_license_submissions_updated_at();

COMMIT;
