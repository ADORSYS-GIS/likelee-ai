-- Schema to support Agency Dashboard metrics

BEGIN;

-- 1. New Agency Users Table
CREATE TABLE IF NOT EXISTS public.agency_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL, 
    
    role text NOT NULL DEFAULT 'talent',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    
    -- Step 1: Basic Information
    full_legal_name text NOT NULL,
    stage_name text,
    email text,
    phone_number text,
    date_of_birth date,
    city text,
    state_province text,
    country text,
    bio_notes text,
    
    -- Step 2: Physical Attributes & Identity
    gender_identity text,
    race_ethnicity text[], 
    hair_color text,
    eye_color text,
    skin_tone text,
    height_feet integer,
    height_inches integer,
    bust_chest_inches integer,
    waist_inches integer,
    hips_inches integer,
    special_skills text[],
    
    -- Step 3: Media & Social
    profile_photo_url text, 
    hero_cameo_url text,    
    photo_gallery text[],   
    voice_sample_url text,  
    instagram_handle text,  
    
    -- Aggregated Metrics (Managed via DB triggers or backend)
    total_earnings_cents bigint NOT NULL DEFAULT 0,
    active_licenses_count integer NOT NULL DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_users_agency ON public.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_creator ON public.agency_users(creator_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_email ON public.agency_users(email);

-- 2. Campaigns (linked to agency_users)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    name text,
    campaign_type text, 
    brand_vertical text, 
    region text,
    
    start_at timestamptz,
    end_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Payments (linked to agency_users)
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    
    booking_id text,
    status text NOT NULL CHECK (status IN ('succeeded','pending','failed')),
    currency_code text NOT NULL DEFAULT 'USD',
    gross_cents integer NOT NULL DEFAULT 0 CHECK (gross_cents >= 0),
    talent_earnings_cents integer NOT NULL DEFAULT 0 CHECK (talent_earnings_cents >= 0),
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Licensing Requests (linked to agency_users)
CREATE TABLE IF NOT EXISTS public.licensing_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    status text NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
    notes text,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Activity Events
CREATE TABLE IF NOT EXISTS public.activity_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    type text NOT NULL,
    subject_table text,
    subject_id uuid,
    title text,
    subtitle text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Update Licensing Tables (Transition to Talent-First)
-- This section cleans up legacy face_user_id columns that cause NOT NULL constraint errors

-- A. Cleanup brand_licenses
ALTER TABLE public.brand_licenses DROP COLUMN IF EXISTS talent_user_id CASCADE;
ALTER TABLE public.brand_licenses DROP COLUMN IF EXISTS face_user_id CASCADE;
ALTER TABLE public.brand_licenses 
    ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'none' CHECK (compliance_status IN ('none','issue','resolved')),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- B. Cleanup brand_voice_folders (if they exist)
ALTER TABLE public.brand_voice_folders DROP COLUMN IF EXISTS face_user_id CASCADE;
ALTER TABLE public.brand_voice_folders 
    ADD COLUMN IF NOT EXISTS talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE;

-- RLS Enablement
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- 7. RLS & Policies
DROP POLICY IF EXISTS "Agency users can view their agency's roster" ON public.agency_users;
CREATE POLICY "Agency users can view their agency's roster" 
    ON public.agency_users FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agency users can view their agency's campaigns" ON public.campaigns;
CREATE POLICY "Agency users can view their agency's campaigns" 
    ON public.campaigns FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agency users can view their agency's payments" ON public.payments;
CREATE POLICY "Agency users can view their agency's payments" 
    ON public.payments FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agency users can view their agency's licensing_requests" ON public.licensing_requests;
CREATE POLICY "Agency users can view their agency's licensing_requests" 
    ON public.licensing_requests FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agency users can view their agency's activity_events" ON public.activity_events;
CREATE POLICY "Agency users can view their agency's activity_events" 
    ON public.activity_events FOR SELECT USING (auth.uid() = agency_id);

COMMIT;