-- 005_scouting.sql
-- Consolidated migration for scouting module
-- Source files: 0002_scouting_module.sql, 20260115_scouting_module.sql (merge),
-- 0005_external_integrations (scouting_templates, scouting_offers)

BEGIN;

-- ============================================================================
-- 1. SCOUTING PROSPECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_prospects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Basic Info
    full_name text NOT NULL,
    email text,
    phone text,
    
    -- Physical Attributes
    age integer,
    gender text,
    height_feet integer,
    height_inches integer,
    hair_color text,
    eye_color text,
    
    -- Source
    source text,
    source_detail text,
    discovered_at timestamptz,
    
    -- Status
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'converted', 'archived')),
    
    -- Notes
    notes text,
    internal_notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_prospects_agency ON public.scouting_prospects(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_status ON public.scouting_prospects(status);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_created ON public.scouting_prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_email ON public.scouting_prospects(email);

ALTER TABLE public.scouting_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own prospects" ON public.scouting_prospects;
CREATE POLICY "Agencies can view own prospects" ON public.scouting_prospects
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own prospects" ON public.scouting_prospects;
CREATE POLICY "Agencies can manage own prospects" ON public.scouting_prospects
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 2. SCOUTING TRIPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Trip Info
    name text NOT NULL,
    location text,
    start_date date,
    end_date date,
    
    -- Status
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    
    -- Results
    prospects_found integer DEFAULT 0,
    prospects_converted integer DEFAULT 0,
    
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_trips_agency ON public.scouting_trips(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_trips_status ON public.scouting_trips(status);
CREATE INDEX IF NOT EXISTS idx_scouting_trips_dates ON public.scouting_trips(start_date, end_date);

ALTER TABLE public.scouting_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own trips" ON public.scouting_trips;
CREATE POLICY "Agencies can view own trips" ON public.scouting_trips
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own trips" ON public.scouting_trips;
CREATE POLICY "Agencies can manage own trips" ON public.scouting_trips
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 3. SCOUTING EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    trip_id uuid REFERENCES public.scouting_trips(id) ON DELETE SET NULL,
    
    -- Event Info
    name text NOT NULL,
    event_type text, -- 'convention', 'show', 'open_call', 'online'
    location text,
    event_date date,
    
    -- Status
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
    
    -- Results
    attendees_count integer DEFAULT 0,
    prospects_identified integer DEFAULT 0,
    
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_events_agency ON public.scouting_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_events_trip ON public.scouting_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_scouting_events_status ON public.scouting_events(status);
CREATE INDEX IF NOT EXISTS idx_scouting_events_date ON public.scouting_events(event_date);

ALTER TABLE public.scouting_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own events" ON public.scouting_events;
CREATE POLICY "Agencies can view own events" ON public.scouting_events
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own events" ON public.scouting_events;
CREATE POLICY "Agencies can manage own events" ON public.scouting_events
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 4. SCOUTING SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    prospect_id uuid REFERENCES public.scouting_prospects(id) ON DELETE SET NULL,
    event_id uuid REFERENCES public.scouting_events(id) ON DELETE SET NULL,
    
    -- Submission Info
    full_name text NOT NULL,
    email text,
    phone text,
    
    -- Media
    photos text[],
    video_url text,
    
    -- Physical Attributes
    age integer,
    gender text,
    height_feet integer,
    height_inches integer,
    hair_color text,
    eye_color text,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected', 'converted')),
    
    -- Review
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_notes text,
    
    -- Converted to talent
    converted_talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    converted_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_submissions_agency ON public.scouting_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_submissions_prospect ON public.scouting_submissions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_scouting_submissions_event ON public.scouting_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_scouting_submissions_status ON public.scouting_submissions(status);
CREATE INDEX IF NOT EXISTS idx_scouting_submissions_email ON public.scouting_submissions(email);

ALTER TABLE public.scouting_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own submissions" ON public.scouting_submissions;
CREATE POLICY "Agencies can view own submissions" ON public.scouting_submissions
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own submissions" ON public.scouting_submissions;
CREATE POLICY "Agencies can manage own submissions" ON public.scouting_submissions
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 5. SCOUTING TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Template Info
    name text NOT NULL,
    description text,
    
    -- Message Template
    subject text NOT NULL,
    body text NOT NULL,
    
    -- Variables that can be used: {{prospect_name}}, {{agency_name}}, {{event_name}}, etc.
    available_variables text[] DEFAULT ARRAY['prospect_name', 'agency_name', 'event_name', 'event_date', 'location'],
    
    -- Usage
    usage_count integer DEFAULT 0,
    last_used_at timestamptz,
    
    -- Status
    is_active boolean DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_templates_agency ON public.scouting_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_templates_active ON public.scouting_templates(agency_id, is_active);

ALTER TABLE public.scouting_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own templates" ON public.scouting_templates;
CREATE POLICY "Agencies can view own templates" ON public.scouting_templates
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own templates" ON public.scouting_templates;
CREATE POLICY "Agencies can manage own templates" ON public.scouting_templates
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 6. SCOUTING OFFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    submission_id uuid NOT NULL REFERENCES public.scouting_submissions(id) ON DELETE CASCADE,
    template_id uuid REFERENCES public.scouting_templates(id) ON DELETE SET NULL,
    
    -- Offer Details
    subject text NOT NULL,
    body text NOT NULL,
    
    -- Status
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'responded', 'accepted', 'declined')),
    
    -- Tracking
    sent_at timestamptz,
    viewed_at timestamptz,
    responded_at timestamptz,
    
    -- Response
    response_notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_offers_agency ON public.scouting_offers(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_submission ON public.scouting_offers(submission_id);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_status ON public.scouting_offers(status);
CREATE INDEX IF NOT EXISTS idx_scouting_offers_sent ON public.scouting_offers(sent_at);

ALTER TABLE public.scouting_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own offers" ON public.scouting_offers;
CREATE POLICY "Agencies can view own offers" ON public.scouting_offers
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own offers" ON public.scouting_offers;
CREATE POLICY "Agencies can manage own offers" ON public.scouting_offers
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 7. FK FIX FUNCTION (from 20260115)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fix_scouting_orphaned_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean up orphaned records where agency no longer exists
    DELETE FROM public.scouting_prospects 
    WHERE agency_id NOT IN (SELECT id FROM public.agencies);
    
    DELETE FROM public.scouting_trips 
    WHERE agency_id NOT IN (SELECT id FROM public.agencies);
    
    DELETE FROM public.scouting_events 
    WHERE agency_id NOT IN (SELECT id FROM public.agencies);
    
    DELETE FROM public.scouting_submissions 
    WHERE agency_id NOT IN (SELECT id FROM public.agencies);
    
    DELETE FROM public.scouting_templates 
    WHERE agency_id NOT IN (SELECT id FROM public.agencies);
    
    DELETE FROM public.scouting_offers 
    WHERE agency_id NOT IN (SELECT id FROM public.agencies);
END;
$$;

COMMIT;
