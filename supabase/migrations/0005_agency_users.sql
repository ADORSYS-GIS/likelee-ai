
BEGIN;

-- 1. Create Agency Users Table
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

-- RLS Enablement
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

-- 7. RLS & Policies
DROP POLICY IF EXISTS "Agency users can view their agency's roster" ON public.agency_users;
CREATE POLICY "Agency users can view their agency's roster" 
    ON public.agency_users FOR SELECT USING (auth.uid() = agency_id);

COMMIT;