-- 016_crm_integrations.sql
-- Consolidated migration for CRM and remaining integrations
-- Source files: 0010_crm_migration.sql (already in 002_agency_core.sql), 
-- 0056_agency_catalogs.sql, 2026-03-10_calendly_booking_events.sql,
-- 2026-04-01_sales_inquiries.sql, 2026-03-10_job_postings.sql

BEGIN;

-- ============================================================================
-- 1. CALENDLY BOOKING EVENTS (from 2026-03-10)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.calendly_booking_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Calendly Event Identifiers
    calendly_event_uuid text NOT NULL UNIQUE,
    calendly_event_type text NOT NULL, -- 'invitee.created', 'invitee.canceled', etc.
    
    -- Invitee Details
    invitee_email text,
    invitee_name text,
    invitee_timezone text,
    
    -- Event Timing
    event_start_time timestamptz,
    event_end_time timestamptz,
    
    -- Status
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'canceled', 'completed', 'no_show')),
    
    -- Raw Payload
    raw_payload jsonb NOT NULL,
    
    -- Agency Link (optional)
    agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
    
    -- Processing
    processed_at timestamptz,
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_uuid ON public.calendly_booking_events(calendly_event_uuid);
CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_agency ON public.calendly_booking_events(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_status ON public.calendly_booking_events(status);
CREATE INDEX IF NOT EXISTS idx_calendly_booking_events_created ON public.calendly_booking_events(created_at DESC);

ALTER TABLE public.calendly_booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own calendly events" ON public.calendly_booking_events;
CREATE POLICY "Agencies can view own calendly events" ON public.calendly_booking_events
    FOR SELECT USING (
        agency_id IN (SELECT id FROM public.agencies WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Service role can manage calendly events" ON public.calendly_booking_events;
CREATE POLICY "Service role can manage calendly events" ON public.calendly_booking_events
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 2. SALES INQUIRIES (from 2026-04-01)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales_inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contact Details
    name text NOT NULL,
    email text NOT NULL,
    company text,
    phone text,
    
    -- Inquiry Details
    inquiry_type text NOT NULL CHECK (inquiry_type IN ('agency', 'brand', 'creator', 'enterprise', 'other')),
    subject text NOT NULL,
    message text NOT NULL,
    
    -- Source
    source text, -- 'website', 'referral', 'ad', 'event'
    utm_source text,
    utm_medium text,
    utm_campaign text,
    
    -- Status
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'opportunity', 'converted', 'archived')),
    
    -- Assignment
    assigned_to uuid,
    
    -- Notes
    internal_notes text,
    
    -- Conversion
    converted_to_agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
    converted_to_brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    converted_to_creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    converted_at timestamptz,
    
    -- Follow-up
    follow_up_date date,
    
    -- Metadata
    ip_address inet,
    user_agent text,
    referrer text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_inquiries_email ON public.sales_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_sales_inquiries_type ON public.sales_inquiries(inquiry_type);
CREATE INDEX IF NOT EXISTS idx_sales_inquiries_status ON public.sales_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_sales_inquiries_created ON public.sales_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_inquiries_follow_up ON public.sales_inquiries(follow_up_date);

ALTER TABLE public.sales_inquiries ENABLE ROW LEVEL SECURITY;

-- Service role can manage all inquiries
DROP POLICY IF EXISTS "Service role can manage sales inquiries" ON public.sales_inquiries;
CREATE POLICY "Service role can manage sales inquiries" ON public.sales_inquiries
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 3. JOB POSTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_postings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Job Details
    title text NOT NULL,
    description text NOT NULL,
    requirements text[],
    responsibilities text[],
    
    -- Location
    location_type text NOT NULL DEFAULT 'onsite' CHECK (location_type IN ('onsite', 'remote', 'hybrid')),
    location_city text,
    location_state text,
    location_country text,
    
    -- Compensation
    compensation_type text CHECK (compensation_type IN ('hourly', 'salary', 'project', 'commission')),
    compensation_min_cents integer,
    compensation_max_cents integer,
    compensation_currency text DEFAULT 'USD',
    
    -- Job Type
    job_type text NOT NULL DEFAULT 'full_time' CHECK (job_type IN ('full_time', 'part_time', 'contract', 'freelance', 'internship')),
    
    -- Industry/Category
    industry text,
    category text,
    
    -- Status
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'closed', 'filled')),
    
    -- Publication
    published_at timestamptz,
    expires_at timestamptz,
    
    -- Application Settings
    application_url text,
    accept_applications boolean DEFAULT true,
    
    -- Metadata
    views_count integer DEFAULT 0,
    applications_count integer DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_agency ON public.job_postings(agency_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON public.job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_type ON public.job_postings(job_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON public.job_postings(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_job_postings_category ON public.job_postings(category);
CREATE INDEX IF NOT EXISTS idx_job_postings_published ON public.job_postings(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_expires ON public.job_postings(expires_at);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own job postings" ON public.job_postings;
CREATE POLICY "Agencies can view own job postings" ON public.job_postings
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own job postings" ON public.job_postings;
CREATE POLICY "Agencies can manage own job postings" ON public.job_postings
    FOR ALL USING (agency_id = auth.uid());

-- Public can view published job postings
DROP POLICY IF EXISTS "Public can view published job postings" ON public.job_postings;
CREATE POLICY "Public can view published job postings" ON public.job_postings
    FOR SELECT USING (status = 'published' AND (expires_at IS NULL OR expires_at > now()));

-- ============================================================================
-- 4. JOB APPLICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    
    -- Applicant
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    applicant_phone text,
    
    -- Application Details
    cover_letter text,
    resume_url text,
    portfolio_url text,
    linkedin_url text,
    website_url text,
    
    -- Experience
    years_experience integer,
    relevant_skills text[],
    
    -- Status
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'shortlisted', 'interview_scheduled', 'rejected', 'hired')),
    
    -- Review
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_notes text,
    
    -- Interview
    interview_scheduled_at timestamptz,
    interview_notes text,
    
    -- Metadata
    ip_address inet,
    user_agent text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON public.job_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created ON public.job_applications(created_at DESC);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view applications for their jobs" ON public.job_applications;
CREATE POLICY "Agencies can view applications for their jobs" ON public.job_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.job_postings jp
            WHERE jp.id = job_posting_id AND jp.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Agencies can manage applications for their jobs" ON public.job_applications;
CREATE POLICY "Agencies can manage applications for their jobs" ON public.job_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.job_postings jp
            WHERE jp.id = job_posting_id AND jp.agency_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. AGENCY CATALOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_catalogs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Catalog Info
    name text NOT NULL,
    description text,
    
    -- Settings
    is_public boolean DEFAULT false,
    is_active boolean DEFAULT true,
    
    -- Access Control
    access_code text,
    require_access_code boolean DEFAULT false,
    
    -- Metadata
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_catalogs_agency ON public.agency_catalogs(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_catalogs_active ON public.agency_catalogs(agency_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_catalogs_public ON public.agency_catalogs(is_public, is_active) WHERE is_public = true;

ALTER TABLE public.agency_catalogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own catalogs" ON public.agency_catalogs;
CREATE POLICY "Agencies can view own catalogs" ON public.agency_catalogs
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own catalogs" ON public.agency_catalogs;
CREATE POLICY "Agencies can manage own catalogs" ON public.agency_catalogs
    FOR ALL USING (agency_id = auth.uid());

-- Public can access public catalogs
DROP POLICY IF EXISTS "Public can view public catalogs" ON public.agency_catalogs;
CREATE POLICY "Public can view public catalogs" ON public.agency_catalogs
    FOR SELECT USING (is_public = true AND is_active = true);

-- ============================================================================
-- 6. AGENCY CATALOG ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_catalog_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id uuid NOT NULL REFERENCES public.agency_catalogs(id) ON DELETE CASCADE,
    
    -- Subject
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    -- Display
    title text,
    description text,
    sort_order integer DEFAULT 0,
    
    -- Status
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_catalog_items_catalog ON public.agency_catalog_items(catalog_id);
CREATE INDEX IF NOT EXISTS idx_agency_catalog_items_talent ON public.agency_catalog_items(talent_id);
CREATE INDEX IF NOT EXISTS idx_agency_catalog_items_sort ON public.agency_catalog_items(catalog_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_agency_catalog_items_featured ON public.agency_catalog_items(catalog_id, is_featured) WHERE is_featured = true;

ALTER TABLE public.agency_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own catalog items" ON public.agency_catalog_items;
CREATE POLICY "Agencies can view own catalog items" ON public.agency_catalog_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_catalogs c
            WHERE c.id = catalog_id AND c.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Public can view public catalog items" ON public.agency_catalog_items;
CREATE POLICY "Public can view public catalog items" ON public.agency_catalog_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_catalogs c
            WHERE c.id = catalog_id AND c.is_public = true AND c.is_active = true
        )
        AND is_active = true
    );

-- ============================================================================
-- 7. AGENCY CATALOG ASSETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_catalog_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id uuid NOT NULL REFERENCES public.agency_catalog_items(id) ON DELETE CASCADE,
    
    -- Asset Details
    asset_type text NOT NULL CHECK (asset_type IN ('photo', 'video', 'digitals', 'comp_card')),
    
    -- Storage
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    
    -- Metadata
    file_name text,
    mime_type text,
    width integer,
    height integer,
    duration_sec integer,
    
    -- Display
    is_primary boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    caption text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_catalog_assets_item ON public.agency_catalog_assets(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_agency_catalog_assets_sort ON public.agency_catalog_assets(catalog_item_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_agency_catalog_assets_primary ON public.agency_catalog_assets(catalog_item_id, is_primary) WHERE is_primary = true;

ALTER TABLE public.agency_catalog_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own catalog assets" ON public.agency_catalog_assets;
CREATE POLICY "Agencies can view own catalog assets" ON public.agency_catalog_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_catalog_items ci
            JOIN public.agency_catalogs c ON c.id = ci.catalog_id
            WHERE ci.id = catalog_item_id AND c.agency_id = auth.uid()
        )
    );

-- ============================================================================
-- 8. AGENCY CATALOG RECORDINGS (Voice samples in catalog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_catalog_recordings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_item_id uuid NOT NULL REFERENCES public.agency_catalog_items(id) ON DELETE CASCADE,
    
    -- Recording Details
    recording_type text NOT NULL CHECK (recording_type IN ('voice_sample', 'interview', 'reel')),
    
    -- Storage
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    
    -- Metadata
    duration_sec integer,
    transcript text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_catalog_recordings_item ON public.agency_catalog_recordings(catalog_item_id);

ALTER TABLE public.agency_catalog_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own catalog recordings" ON public.agency_catalog_recordings;
CREATE POLICY "Agencies can view own catalog recordings" ON public.agency_catalog_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_catalog_items ci
            JOIN public.agency_catalogs c ON c.id = ci.catalog_id
            WHERE ci.id = catalog_item_id AND c.agency_id = auth.uid()
        )
    );

COMMIT;
