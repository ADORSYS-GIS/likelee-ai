-- 005_scouting.sql
-- Consolidated migration for scouting module
-- Source files: 0002_scouting_module.sql, 20260115_scouting_module.sql (merge),
-- 0005_external_integrations (scouting_templates, scouting_offers)
--
-- FIXED (2026-05-18): Restored all missing columns from 20260115_scouting_module.sql
-- that were lost during consolidation (prospects: instagram_handle, categories,
-- engagement_rate, assigned_agent_id, etc.; trips: trip_type, latitude, etc.;
-- events: event_type, casting_for, 20+ open call fields; submissions: phone, etc.)

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
    instagram_handle text,
    
    -- Attributes & Metrics (from 20260115)
    categories text[],
    instagram_followers bigint,
    engagement_rate numeric(5,2),
    
    -- Physical Attributes
    age integer,
    gender text,
    height_feet integer,
    height_inches integer,
    hair_color text,
    eye_color text,
    
    -- Status & Assignment (from 20260115)
    status text NOT NULL DEFAULT 'new_lead' CHECK (
        status IN (
            'new',
            'new_lead',
            'contacted',
            'in_contact',
            'interested',
            'not_interested',
            'converted',
            'archived',
            'meeting',
            'test_shoot',
            'test_shoot_pending',
            'test_shoot_success',
            'test_shoot_failed',
            'offer_sent',
            'signed',
            'declined'
        )
    ),
    assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_agent_name text,
    
    -- Source / Discovery (from 20260115)
    source text,
    source_detail text,
    discovery_date date DEFAULT CURRENT_DATE,
    discovery_location text,
    referred_by text,
    discovered_at timestamptz,
    
    -- Notes & Rating
    notes text,
    internal_notes text,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_prospects_agency ON public.scouting_prospects(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_status ON public.scouting_prospects(status);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_created ON public.scouting_prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_email ON public.scouting_prospects(email);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_assigned_agent ON public.scouting_prospects(assigned_agent_id);

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
    location text NOT NULL,
    start_date date,
    end_date date,
    description text,
    
    -- Extended Fields (from 20260115)
    trip_type text,
    start_time text,
    end_time text,
    scout_names text[],
    photos text[],
    latitude numeric(10,7),
    longitude numeric(10,7),
    
    -- Metrics (from 20260115)
    prospects_approached integer DEFAULT 0,
    prospects_added integer DEFAULT 0,
    prospects_agreed integer DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    total_cost numeric(12,2) DEFAULT 0,
    
    -- Status
    status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'ongoing')),
    
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
-- 3. SCOUTING EVENTS (Open Calls)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    trip_id uuid REFERENCES public.scouting_trips(id) ON DELETE SET NULL,
    
    -- Event Info
    name text NOT NULL,
    event_type text,
    event_date timestamptz NOT NULL,
    location text NOT NULL,
    description text,
    
    -- Open Call Details (from 20260115)
    casting_for text,
    start_time text,
    end_time text,
    looking_for text[],
    min_age integer DEFAULT 18,
    max_age integer DEFAULT 30,
    gender_preference text DEFAULT 'all',
    special_skills text,
    what_to_bring text,
    dress_code text,
    location_details text,
    virtual_link text,
    max_attendees integer,
    registration_required boolean DEFAULT false,
    
    -- Contact (from 20260115)
    internal_notes text,
    contact_name text,
    contact_email text,
    contact_phone text,
    
    -- Goals & Tracking (from 20260115)
    targeted_talent_goal integer,
    registration_fee numeric(10,2),
    expected_attendance integer,
    is_attending boolean,
    prospects_to_meet text[],
    past_success_rate numeric(5,2),
    calendar_event_id text,
    sync_with_calendar boolean,
    
    -- Status
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'planned', 'scheduled', 'published', 'completed', 'cancelled')),
    
    -- Results
    attendees_count integer DEFAULT 0,
    prospects_identified integer DEFAULT 0,
    
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
-- 4. SCOUTING SUBMISSIONS (Website Applications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scouting_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    prospect_id uuid REFERENCES public.scouting_prospects(id) ON DELETE SET NULL,
    event_id uuid REFERENCES public.scouting_events(id) ON DELETE SET NULL,
    
    -- Submission Info
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    instagram text,
    
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
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected', 'converted', 'reviewed', 'contacted')),
    
    -- Review
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_notes text,
    
    -- Submitted at
    submitted_at timestamptz DEFAULT now(),
    
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
    document_name text,
    
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

-- ============================================================================
-- 7. SCOUTING OFFER DOCUMENT NAME TRIGGERS (from 0005)
-- ============================================================================

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

COMMIT;
