-- Create license_templates table with true idempotency
CREATE TABLE IF NOT EXISTS public.license_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS template_name TEXT NOT NULL DEFAULT 'Untitled Template';
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Custom' CHECK (category IN ('Social Media', 'E-commerce', 'Advertising', 'Editorial', 'Film & TV', 'Custom'));
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS usage_scope TEXT;
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS territory TEXT NOT NULL DEFAULT 'Worldwide';
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS exclusivity TEXT NOT NULL DEFAULT 'Non-exclusive' CHECK (exclusivity IN ('Non-exclusive', 'Category exclusive', 'Full exclusivity'));
ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS modifications_allowed TEXT;
-- 2. Consolidate legacy fee columns into license_fee
DO $$ 
BEGIN
    -- Ensure the target column exists first
    ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS license_fee BIGINT;

    -- Migrate from pricing_range_min_cents
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_templates' AND column_name='pricing_range_min_cents') THEN
        UPDATE public.license_templates SET license_fee = pricing_range_min_cents WHERE license_fee IS NULL;
        ALTER TABLE public.license_templates DROP COLUMN pricing_range_min_cents;
        ALTER TABLE public.license_templates DROP COLUMN IF EXISTS pricing_range_max_cents;
    END IF;

    -- Migrate from license_fee_min_cents
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_templates' AND column_name='license_fee_min_cents') THEN
        UPDATE public.license_templates SET license_fee = license_fee_min_cents WHERE license_fee IS NULL;
        ALTER TABLE public.license_templates DROP COLUMN license_fee_min_cents;
        ALTER TABLE public.license_templates DROP COLUMN IF EXISTS license_fee_max_cents;
    END IF;

    -- Migrate from license_fee_cents
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_templates' AND column_name='license_fee_cents') THEN
        UPDATE public.license_templates SET license_fee = license_fee_cents WHERE license_fee IS NULL;
        ALTER TABLE public.license_templates DROP COLUMN license_fee_cents;
    END IF;

    -- Handle additional_terms -> custom_terms
    ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS custom_terms TEXT;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_templates' AND column_name='additional_terms') THEN
        UPDATE public.license_templates SET custom_terms = additional_terms WHERE custom_terms IS NULL;
        ALTER TABLE public.license_templates DROP COLUMN additional_terms;
    END IF;

    -- Ensure other metadata columns exist
    ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
    ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.license_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_license_templates_agency ON public.license_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_license_templates_category ON public.license_templates(category);

-- RLS Policies
ALTER TABLE public.license_templates ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'license_templates' AND policyname = 'Agencies can view their own templates') THEN
        CREATE POLICY "Agencies can view their own templates"
            ON public.license_templates FOR SELECT
            USING (auth.uid() IN (
                SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'license_templates' AND policyname = 'Agencies can insert their own templates') THEN
        CREATE POLICY "Agencies can insert their own templates"
            ON public.license_templates FOR INSERT
            WITH CHECK (auth.uid() IN (
                SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'license_templates' AND policyname = 'Agencies can update their own templates') THEN
        CREATE POLICY "Agencies can update their own templates"
            ON public.license_templates FOR UPDATE
            USING (auth.uid() IN (
                SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
            ))
            WITH CHECK (auth.uid() IN (
                SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'license_templates' AND policyname = 'Agencies can delete their own templates') THEN
        CREATE POLICY "Agencies can delete their own templates"
            ON public.license_templates FOR DELETE
            USING (auth.uid() IN (
                SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
            ));
    END IF;
END $$;

-- Active Licenses Schema Changes (Idempotent)
ALTER TABLE public.licensing_requests ADD COLUMN IF NOT EXISTS license_start_date DATE;
ALTER TABLE public.licensing_requests ADD COLUMN IF NOT EXISTS license_end_date DATE;
ALTER TABLE public.licensing_requests ADD COLUMN IF NOT EXISTS client_name TEXT;

CREATE INDEX IF NOT EXISTS idx_licensing_requests_end_date ON public.licensing_requests(license_end_date);

-- Licensing Flow Updates
ALTER TABLE public.licensing_requests DROP CONSTRAINT IF EXISTS licensing_requests_status_check;
ALTER TABLE public.licensing_requests ADD CONSTRAINT licensing_requests_status_check CHECK (status IN ('pending', 'negotiating', 'approved', 'rejected', 'declined'));
ALTER TABLE public.licensing_requests ADD COLUMN IF NOT EXISTS negotiation_reason text;

-- Ensure licensing_request_id is on the payments and campaigns tables
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_licensing_request_id ON public.payments(licensing_request_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_licensing_request_id ON public.campaigns(licensing_request_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_agency_status ON public.licensing_requests(agency_id, status);
