-- Calendly Booking Events Tracking
-- Stores webhook events from Calendly for IRL demo booking tracking

CREATE TABLE IF NOT EXISTS public.calendly_booking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Calendly event identifiers
    calendly_event_uuid TEXT NOT NULL UNIQUE,
    calendly_event_type TEXT NOT NULL, -- e.g., 'invitee.created', 'invitee.canceled'
    
    -- Booking details
    invitee_email TEXT,
    invitee_name TEXT,
    invitee_timezone TEXT,
    
    -- Event timing
    event_start_time TIMESTAMPTZ,
    event_end_time TIMESTAMPTZ,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'canceled', 'completed', 'no_show'
    
    -- Raw payload for debugging/audit
    raw_payload JSONB NOT NULL,
    
    -- Agency association (optional - for linking to agency)
    agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
    
    -- Tracking
    processed_at TIMESTAMPTZ,
    notes TEXT
);

-- Index for quick lookups by event UUID
CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_uuid 
    ON public.calendly_booking_events(calendly_event_uuid);

-- Index for agency lookups
CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_agency 
    ON public.calendly_booking_events(agency_id) 
    WHERE agency_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_status 
    ON public.calendly_booking_events(status);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_created_at 
    ON public.calendly_booking_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.calendly_booking_events ENABLE ROW LEVEL SECURITY;

-- Policy: Agencies can view their own booking events
CREATE POLICY "Agencies can view their own calendly booking events"
    ON public.calendly_booking_events FOR SELECT
    TO authenticated
    USING (
        agency_id IN (
            SELECT id FROM public.agencies WHERE user_id = auth.uid()
        )
    );

-- Policy: Service role can manage all booking events (for webhook processing)
CREATE POLICY "Service role can manage all calendly booking events"
    ON public.calendly_booking_events FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.calendly_booking_events IS 'Tracks Calendly booking events received via webhook for IRL demo scheduling';
COMMENT ON COLUMN public.calendly_booking_events.calendly_event_uuid IS 'Unique identifier from Calendly for the booking event';
COMMENT ON COLUMN public.calendly_booking_events.calendly_event_type IS 'Type of Calendly event: invitee.created, invitee.canceled, etc.';
COMMENT ON COLUMN public.calendly_booking_events.raw_payload IS 'Full JSON payload from Calendly webhook for audit/debugging';
