-- Agency Calendly Settings
-- Stores agency-specific Calendly configuration and event type mappings

CREATE TABLE IF NOT EXISTS public.agency_calendly_settings (
    agency_id UUID PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    calendly_api_token TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mappings JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store mapping of booking types to Calendly event slugs
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_calendly_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Agencies can manage their own Calendly settings
CREATE POLICY "Agencies can manage their own calendly settings"
    ON public.agency_calendly_settings
    FOR ALL
    TO authenticated
    USING (
        agency_id IN (
            SELECT id FROM public.agencies WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        agency_id IN (
            SELECT id FROM public.agencies WHERE user_id = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE public.agency_calendly_settings IS 'Stores agency-specific Calendly configuration and event type mappings';
COMMENT ON COLUMN public.agency_calendly_settings.mappings IS 'JSON object mapping internal booking types (e.g., "confirmed", "casting") to Calendly event type slugs';
