
BEGIN;

-- 1. Create Agency Users Table
CREATE TABLE IF NOT EXISTS public.agency_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id)
    
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
CREATE INDEX IF NOT EXISTS idx_agency_users_email ON public.agency_users(email);

-- RLS Enablement
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

-- 7. RLS & Policies
DROP POLICY IF EXISTS "Agency users can view their agency's roster" ON public.agency_users;
CREATE POLICY "Agency users can view their agency's roster" 
    ON public.agency_users FOR SELECT USING (auth.uid() = agency_id);

COMMIT;


-- 1. Verify Payments Data (Source of Revenue)
-- Should show 'gross_cents' (Agency Revenue) and 'talent_earnings_cents' (Talent Cut)
SELECT 
    'PAYMENTS' as check_type,
    id, 
    gross_cents as agency_revenue, 
    talent_earnings_cents, 
    status, 
    paid_at 
FROM payments 
WHERE status = 'succeeded' 
ORDER BY paid_at DESC 
LIMIT 5;

-- 2. Verify Campaign Metadata (Source of Breakdowns)
-- When joined with payments, we get revenue by Type/Vertical/Region
SELECT 
    'CAMPAIGN_META' as check_type,
    id, 
    name, 
    campaign_type, 
    brand_vertical, 
    region 
FROM campaigns 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Verify Agency User Earnings (Source of Top Talent)
-- 'earnings_30d' should reflect recent payouts
SELECT 
    'AGENCY_USER' as check_type,
    total_earnings_cents,
    stage_name, 
    full_legal_name, 
    earnings_30d 
FROM agency_users 
WHERE role = 'talent' 
ORDER BY earnings_30d DESC 
LIMIT 5;

-- 4. Verify Licensing Pipeline
-- Check pending requests and active licenses
SELECT 'PENDING_REQUESTS' as metric, count(*) FROM licensing_requests WHERE status = 'pending';
SELECT 'ACTIVE_LICENSES' as metric, count(*) FROM brand_licenses WHERE status = 'active';
