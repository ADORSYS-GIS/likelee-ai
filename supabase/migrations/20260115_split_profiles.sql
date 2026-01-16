-- 20260115_split_profiles.sql
-- Create independent tables for brands and agencies

BEGIN;

-- 1. Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name text NOT NULL,
    contact_name text,
    contact_title text,
    email text NOT NULL,
    website text,
    phone_number text,
    industry text,
    primary_goal jsonb,
    geographic_target text,
    provide_creators text,
    production_type text,
    budget_range text,
    creates_for text,
    uses_ai text,
    roles_needed jsonb,
    status text DEFAULT 'waitlist',
    onboarding_step text DEFAULT 'email_verification',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create agencies table
CREATE TABLE IF NOT EXISTS public.agencies (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_name text NOT NULL,
    contact_name text,
    contact_title text,
    email text NOT NULL,
    website text,
    phone_number text,
    agency_type text, -- marketing_agency, talent_agency, sports_agency
    client_count text,
    campaign_budget text,
    services_offered jsonb,
    provide_creators text,
    handle_contracts text,
    talent_count text,
    licenses_likeness text,
    open_to_ai jsonb,
    campaign_types jsonb,
    bulk_onboard text,
    status text DEFAULT 'waitlist',
    onboarding_step text DEFAULT 'email_verification',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_brands_email ON public.brands(email);
CREATE INDEX IF NOT EXISTS idx_agencies_email ON public.agencies(email);
CREATE INDEX IF NOT EXISTS idx_agencies_type ON public.agencies(agency_type);

-- 4. RLS for brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brand profile" ON public.brands;
CREATE POLICY "Users can view their own brand profile" ON public.brands
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own brand profile" ON public.brands;
CREATE POLICY "Users can update their own brand profile" ON public.brands
    FOR UPDATE USING (auth.uid() = id);

-- 5. RLS for agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own agency profile" ON public.agencies;
CREATE POLICY "Users can view their own agency profile" ON public.agencies
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own agency profile" ON public.agencies;
CREATE POLICY "Users can update their own agency profile" ON public.agencies
    FOR UPDATE USING (auth.uid() = id);

-- 6. Cleanup profiles table
-- Sync existing roles to auth.users metadata to ensure no data loss during transition
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', p.role)
    ELSE raw_user_meta_data || jsonb_build_object('role', p.role)
  END
FROM public.profiles p
WHERE p.id = auth.users.id 
  AND p.role IS NOT NULL 
  AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' = '');

-- Safely drop the redundant role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 7. Rename profiles table to creators
ALTER TABLE IF EXISTS public.profiles RENAME TO creators;

COMMIT;
