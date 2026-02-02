-- Create license_templates table
CREATE TABLE IF NOT EXISTS public.license_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Social Media', 'E-commerce', 'Advertising', 'Editorial', 'Film & TV', 'Custom')),
    description TEXT,
    usage_scope TEXT,
    duration_days INTEGER NOT NULL,
    territory TEXT NOT NULL,
    exclusivity TEXT NOT NULL CHECK (exclusivity IN ('Non-exclusive', 'Category exclusive', 'Full exclusivity')),
    modifications_allowed TEXT,
    pricing_range_min_cents BIGINT,
    pricing_range_max_cents BIGINT,
    additional_terms TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_license_templates_agency ON public.license_templates(agency_id);
CREATE INDEX idx_license_templates_category ON public.license_templates(category);

-- RLS Policies
ALTER TABLE public.license_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can view their own templates"
    ON public.license_templates FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
    ));

CREATE POLICY "Agencies can insert their own templates"
    ON public.license_templates FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
    ));

CREATE POLICY "Agencies can update their own templates"
    ON public.license_templates FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
    ))
    WITH CHECK (auth.uid() IN (
        SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
    ));

CREATE POLICY "Agencies can delete their own templates"
    ON public.license_templates FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM public.agency_users WHERE agency_id = public.license_templates.agency_id
    ));
