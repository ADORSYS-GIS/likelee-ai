ALTER TABLE public.agency_calendly_settings
ADD COLUMN IF NOT EXISTS scheduling_url TEXT;

COMMENT ON COLUMN public.agency_calendly_settings.scheduling_url IS
'Public Calendly scheduling page URL used for embedded or redirect booking flows.';
