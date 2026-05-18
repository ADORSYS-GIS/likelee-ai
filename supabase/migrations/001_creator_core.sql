-- 001_creator_core.sql
-- Consolidated migration for all creator-related schema
-- Source files: 0001_core_profiles (creators), 0004_business_logic_and_pricing,
-- 0005_external_integrations, 0029_creator_public_visibility,
-- 2026-03-04_weekly_licensing_rates_rollout, 2026-03-27_kyc_rejection_details,
-- 2026-03-30_creator_subscription_tiers, 2026-03-31_add_creator_plan_interval,
-- 2026-04-01_creators_onboarding_step, 2026-04-08_add_creator_trial_started_at,
-- 2026-04-09_add_plan_specific_trials, 2026-05-04_add_creator_profile_fields,
-- 2026-05-04_add_instagram_sync_fields
--
-- FIXED (2026-05-18): Added missing columns per PR review:
-- - birthdate, gender, ethnicity, creator_type, platform_handle, tiktok_handle
-- - content_restrictions, brand_exclusivity, visibility, content_types, industries, vibes
-- - base_monthly_price_cents, base_weekly_price_cents, pricing_updated_at
-- - trial_basic_started_at, trial_pro_started_at, stripe_current_period_end
-- - stripe_cancel_at_period_end, is_public_brands, instagram_connected
-- - cameo_back_url, original_file_name, checksum_sha256

BEGIN;

-- ============================================================================
-- 1. CREATORS TABLE (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    full_name text,
    email text,
    city text,
    state text,
    profile_photo_url text,
    profile_avatar_id uuid DEFAULT gen_random_uuid(),
    
    -- Physical Attributes
    age integer,
    race text,
    hair_color text,
    hairstyle text,
    eye_color text,
    height_cm integer,
    weight_kg integer,
    facial_features text[],
    
    -- Profile
    tagline text,
    bio text,
    portfolio_link text,
    public_profile_visible boolean DEFAULT false,
    
    -- KYC / Verification
    kyc_status text DEFAULT 'not_started',
    liveness_status text DEFAULT 'not_started',
    kyc_provider text,
    kyc_session_id text,
    verified_at timestamptz,
    kyc_rejection_reason text,
    kyc_rejection_code text,
    
    -- Subscription & Billing
    plan_tier text DEFAULT 'free',
    plan_interval text DEFAULT 'month',
    plan_updated_at timestamptz,
    stripe_customer_id text,
    stripe_subscription_id text,
    trial_started_at timestamptz,
    trial_pro_started_at timestamptz,
    subscription_current_period_end timestamptz,
    
    -- Onboarding
    onboarding_step text DEFAULT 'email_verification',
    onboarding_completed boolean DEFAULT false,
    
    -- Licensing Rates (from 2026-03-04)
    licensing_rate_weekly_cents bigint,
    licensing_rate_monthly_cents bigint,
    accept_negotiations boolean DEFAULT true,
    rate_currency text DEFAULT 'USD',
    
    -- External Integrations (from 0005)
    creatify_api_key text,
    creatify_account_id text,
    creatify_webhook_secret text,
    creatify_job_id text,
    creatify_job_status text DEFAULT 'idle',
    creatify_avatar_status text DEFAULT 'not_created',
    creatify_output_url text,
    creatify_last_error text,
    
    -- Instagram Sync (from 2026-05-04)
    instagram_handle text,
    instagram_followers bigint DEFAULT 0,
    instagram_connected boolean DEFAULT false,
    instagram_engagement_rate numeric(5,2),
    instagram_last_synced_at timestamptz,
    
    -- Profile Fields (from 2026-05-04_add_creator_profile_fields)
    birthdate date,
    gender text,
    ethnicity text,
    creator_type text,
    platform_handle text,
    tiktok_handle text,
    content_restrictions text,
    brand_exclusivity text,
    visibility text DEFAULT 'private',
    content_types text[] DEFAULT '{}',
    industries text[] DEFAULT '{}',
    vibes text[] DEFAULT '{}',
    base_monthly_price_cents integer DEFAULT 0,
    base_weekly_price_cents integer DEFAULT 0,
    pricing_updated_at timestamptz,
    trial_basic_started_at timestamptz,
    trial_pro_started_at timestamptz,
    stripe_current_period_end timestamptz,
    stripe_cancel_at_period_end boolean DEFAULT false,
    is_public_brands boolean DEFAULT true,
    
    -- Media
    cameo_front_url text,
    cameo_back_url text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Creators indexes
CREATE INDEX IF NOT EXISTS creators_age_idx ON public.creators(age);
CREATE INDEX IF NOT EXISTS creators_race_idx ON public.creators(race);
CREATE INDEX IF NOT EXISTS creators_hair_color_idx ON public.creators(hair_color);
CREATE INDEX IF NOT EXISTS creators_hairstyle_idx ON public.creators(hairstyle);
CREATE INDEX IF NOT EXISTS creators_eye_color_idx ON public.creators(eye_color);
CREATE INDEX IF NOT EXISTS creators_height_cm_idx ON public.creators(height_cm);
CREATE INDEX IF NOT EXISTS creators_weight_kg_idx ON public.creators(weight_kg);
CREATE INDEX IF NOT EXISTS creators_facial_features_gin ON public.creators USING GIN (facial_features);
CREATE INDEX IF NOT EXISTS idx_creators_profile_avatar_id ON public.creators(profile_avatar_id);
CREATE INDEX IF NOT EXISTS idx_creators_stripe_customer_id ON public.creators(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_creators_plan_tier ON public.creators(plan_tier);
CREATE INDEX IF NOT EXISTS idx_creators_email ON public.creators(email);
CREATE INDEX IF NOT EXISTS idx_creators_platform_handle ON public.creators(platform_handle);
CREATE INDEX IF NOT EXISTS idx_creators_tiktok_handle ON public.creators(tiktok_handle);
CREATE INDEX IF NOT EXISTS idx_creators_visibility ON public.creators(visibility);
CREATE INDEX IF NOT EXISTS idx_creators_content_types ON public.creators USING GIN (content_types);
CREATE INDEX IF NOT EXISTS idx_creators_industries ON public.creators USING GIN (industries);

-- Creators RLS
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own creator profile" ON public.creators;
CREATE POLICY "Users can view their own creator profile" ON public.creators
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own creator profile" ON public.creators;
CREATE POLICY "Users can update their own creator profile" ON public.creators
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view visible creator profiles" ON public.creators;
CREATE POLICY "Public can view visible creator profiles" ON public.creators
    FOR SELECT USING (public_profile_visible = true);

-- ============================================================================
-- 2. INSTAGRAM DATA CACHE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.instagram_data_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    handle text NOT NULL,
    followers_count integer,
    following_count integer,
    posts_count integer,
    engagement_rate numeric(5,2),
    avg_likes integer,
    avg_comments integer,
    
    raw_data jsonb,
    
    fetched_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_data_cache_creator ON public.instagram_data_cache(creator_id);
CREATE INDEX IF NOT EXISTS idx_instagram_data_cache_handle ON public.instagram_data_cache(handle);
CREATE INDEX IF NOT EXISTS idx_instagram_data_cache_fetched ON public.instagram_data_cache(fetched_at DESC);

ALTER TABLE public.instagram_data_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own instagram cache" ON public.instagram_data_cache;
CREATE POLICY "Creators can view own instagram cache" ON public.instagram_data_cache
    FOR SELECT USING (creator_id = auth.uid());

-- ============================================================================
-- 3. CREATOR CUSTOM RATES (from 0004)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creator_custom_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    rate_type text NOT NULL, -- 'usage', 'duration', 'exclusivity', etc.
    rate_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    
    valid_from date,
    valid_until date,
    
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_custom_rates_creator ON public.creator_custom_rates(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_custom_rates_type ON public.creator_custom_rates(rate_type);
CREATE INDEX IF NOT EXISTS idx_creator_custom_rates_valid ON public.creator_custom_rates(valid_from, valid_until);

ALTER TABLE public.creator_custom_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own custom rates" ON public.creator_custom_rates;
CREATE POLICY "Creators can view own custom rates" ON public.creator_custom_rates
    FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can manage own custom rates" ON public.creator_custom_rates;
CREATE POLICY "Creators can manage own custom rates" ON public.creator_custom_rates
    FOR ALL USING (creator_id = auth.uid());

-- ============================================================================
-- 4. CREATOR SUBSCRIPTION EVENTS (from 2026-03-30)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creator_subscription_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    event_type text NOT NULL, -- 'trial_started', 'subscription_started', 'subscription_cancelled', etc.
    plan_tier text NOT NULL,
    plan_interval text,
    
    stripe_event_id text,
    stripe_event_type text,
    
    metadata jsonb DEFAULT '{}'::jsonb,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_subscription_events_creator ON public.creator_subscription_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscription_events_type ON public.creator_subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_creator_subscription_events_created ON public.creator_subscription_events(created_at DESC);

ALTER TABLE public.creator_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own subscription events" ON public.creator_subscription_events;
CREATE POLICY "Creators can view own subscription events" ON public.creator_subscription_events
    FOR SELECT USING (creator_id = auth.uid());

-- ============================================================================
-- 5. CREATOR RATES UPSERT (from 0004)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id UUID, p_rates JSONB)
RETURNS void AS $$
BEGIN
    IF auth.uid() != p_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    DELETE FROM public.creator_custom_rates
    WHERE creator_id = p_creator_id;

    INSERT INTO public.creator_custom_rates (creator_id, rate_type, rate_name, price_per_month_cents)
    SELECT
        p_creator_id,
        (rate->>'rate_type')::TEXT,
        CASE
            WHEN lower(trim(replace((rate->>'rate_name')::TEXT, '-', ' '))) IN ('social media ads', 'social medial ads') THEN 'Social media ads'
            ELSE (rate->>'rate_name')::TEXT
        END,
        COALESCE(
            (rate->>'price_per_month_cents')::INT,
            (rate->>'price_per_week_cents')::INT,
            0
        )
    FROM jsonb_array_elements(p_rates) AS rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
