-- 003_assets_moderation.sql
-- Consolidated migration for assets and moderation
-- Source files: 0003_assets_storage_moderation.sql, 0007_agency_talent_management.sql (digitals),
-- 0020_voice_models_allow_agencies.sql, 2026-04-15_storage_assets_registry.sql,
-- 2026-04-21_storage_assets_new_context_types.sql
--
-- FIXED (2026-05-18): Added missing columns per PR review:
-- storage_assets: original_file_name, checksum_sha256, deleted_at
-- Added context types: booking_file, talent_asset, brand_voice_asset

BEGIN;

-- ============================================================================
-- 1. MODERATION EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Asset being moderated
    image_url text NOT NULL,
    user_id text,
    image_role text,
    
    -- Moderation Result
    flagged boolean NOT NULL DEFAULT false,
    labels jsonb NOT NULL DEFAULT '[]'::jsonb,
    
    -- Review
    review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    reviewed_by text,
    reviewed_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_events_flagged ON public.moderation_events(flagged);
CREATE INDEX IF NOT EXISTS idx_moderation_events_review_status ON public.moderation_events(review_status);
CREATE INDEX IF NOT EXISTS idx_moderation_events_created_at ON public.moderation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_user_id ON public.moderation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_events_image_url ON public.moderation_events(image_url);

ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. REFERENCE IMAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reference_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Image Details
    section_id text NOT NULL, -- 'headshot_neutral', 'cameo_front', etc.
    
    -- Storage
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    
    -- Metadata
    width integer,
    height integer,
    size_bytes bigint,
    mime_type text,
    sha256 text,
    
    -- Moderation
    moderation_status text NOT NULL DEFAULT 'approved',
    moderation_reason text,
    
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_images_user_section_path
    ON public.reference_images (user_id, section_id, storage_path);
CREATE INDEX IF NOT EXISTS idx_reference_images_user ON public.reference_images(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_images_section ON public.reference_images(section_id);

ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reference_images owner select" ON public.reference_images;
CREATE POLICY "reference_images owner select" ON public.reference_images
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reference_images owner insert" ON public.reference_images;
CREATE POLICY "reference_images owner insert" ON public.reference_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reference_images owner update" ON public.reference_images;
CREATE POLICY "reference_images owner update" ON public.reference_images
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reference_images owner delete" ON public.reference_images;
CREATE POLICY "reference_images owner delete" ON public.reference_images
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. DIGITALS (Talent comp cards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.digitals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    -- Photos
    photo_urls text[] NOT NULL DEFAULT '{}'::text[],
    
    -- Measurements
    height_feet integer,
    height_inches integer,
    weight_lbs integer,
    bust_inches integer,
    waist_inches integer,
    hips_inches integer,
    measurements text, -- computed "bust-waist-hips"
    
    -- Status
    status text NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'expired', 'needs_update')),
    
    -- Comp Card
    comp_card_url text,
    
    -- Validity
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    expires_at date,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digitals_talent_id ON public.digitals(talent_id);
CREATE INDEX IF NOT EXISTS idx_digitals_status ON public.digitals(status);
CREATE INDEX IF NOT EXISTS idx_digitals_updated_at ON public.digitals(updated_at DESC);

ALTER TABLE public.digitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view digitals for their talents" ON public.digitals;
CREATE POLICY "Agencies can view digitals for their talents" ON public.digitals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_users au
            WHERE au.id = talent_id AND au.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Agencies can manage digitals for their talents" ON public.digitals;
CREATE POLICY "Agencies can manage digitals for their talents" ON public.digitals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.agency_users au
            WHERE au.id = talent_id AND au.agency_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agency_users au
            WHERE au.id = talent_id AND au.agency_id = auth.uid()
        )
    );

-- ============================================================================
-- 4. VOICE RECORDINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.voice_recordings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Storage
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    
    -- Audio Metadata
    duration_sec integer,
    mime_type text,
    
    -- Classification
    emotion_tag text,
    accessible boolean NOT NULL DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_recordings_user ON public.voice_recordings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_recordings_path ON public.voice_recordings(storage_bucket, storage_path);

ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_recordings owner select" ON public.voice_recordings;
CREATE POLICY "voice_recordings owner select" ON public.voice_recordings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_recordings owner insert" ON public.voice_recordings;
CREATE POLICY "voice_recordings owner insert" ON public.voice_recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_recordings owner update" ON public.voice_recordings;
CREATE POLICY "voice_recordings owner update" ON public.voice_recordings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_recordings owner delete" ON public.voice_recordings;
CREATE POLICY "voice_recordings owner delete" ON public.voice_recordings
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 5. VOICE MODELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.voice_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Provider
    provider text NOT NULL, -- 'elevenlabs', 'resemble', etc.
    provider_voice_id text NOT NULL,
    
    -- Status
    status text NOT NULL DEFAULT 'ready',
    
    -- Source
    source_recording_id uuid REFERENCES public.voice_recordings(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata jsonb,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_models_user ON public.voice_models(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_models_provider ON public.voice_models(provider);

ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_models owner select" ON public.voice_models;
CREATE POLICY "voice_models owner select" ON public.voice_models
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_models owner insert" ON public.voice_models;
CREATE POLICY "voice_models owner insert" ON public.voice_models
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "voice_models owner update" ON public.voice_models;
CREATE POLICY "voice_models owner update" ON public.voice_models
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. STORAGE ASSETS REGISTRY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.storage_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership (polymorphic)
    owner_type text NOT NULL CHECK (owner_type IN ('agency', 'brand', 'creator', 'talent')),
    owner_id uuid NOT NULL,

    -- Storage Details
    bucket_id text NOT NULL,
    storage_path text NOT NULL,
    public_url text,

    -- Asset Metadata
    file_name text NOT NULL,
    original_file_name text,
    mime_type text,
    size_bytes bigint,
    width integer,
    height integer,
    duration_sec integer,
    checksum_sha256 text,

    -- Context (what this asset is used for)
    context_type text NOT NULL CHECK (context_type IN (
        'avatar', 'logo', 'portfolio', 'digitals', 'voice_sample',
        'contract', 'invoice', 'receipt', 'license', 'reference_image',
        'studio_generation', 'brand_asset', 'campaign_asset', 'booking_deliverable',
        'message_attachment', 'email_attachment', 'booking_file', 'talent_asset', 'brand_voice_asset'
    )),
    context_id uuid,

    -- Status
    is_active boolean DEFAULT true,
    deleted_at timestamptz,

    -- Moderation
    moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    moderated_at timestamptz,
    moderated_by uuid REFERENCES auth.users(id),

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_assets_owner ON public.storage_assets(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_storage_assets_bucket_path ON public.storage_assets(bucket_id, storage_path);
CREATE INDEX IF NOT EXISTS idx_storage_assets_context ON public.storage_assets(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_storage_assets_moderation ON public.storage_assets(moderation_status);
CREATE INDEX IF NOT EXISTS idx_storage_assets_active ON public.storage_assets(owner_type, owner_id, is_active);

ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their storage assets" ON public.storage_assets;
CREATE POLICY "Owners can view their storage assets" ON public.storage_assets
    FOR SELECT USING (
        (owner_type = 'agency' AND owner_id = auth.uid()) OR
        (owner_type = 'brand' AND owner_id = auth.uid()) OR
        (owner_type = 'creator' AND owner_id = auth.uid())
    );

-- ============================================================================
-- 7. TRIGGER: Auto-update digitals measurements
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_digitals_measurements()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bust_inches IS NOT NULL AND NEW.waist_inches IS NOT NULL AND NEW.hips_inches IS NOT NULL THEN
        NEW.measurements := NEW.bust_inches::text || '-' || NEW.waist_inches::text || '-' || NEW.hips_inches::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_digitals_measurements ON public.digitals;
CREATE TRIGGER trigger_update_digitals_measurements
    BEFORE INSERT OR UPDATE ON public.digitals
    FOR EACH ROW EXECUTE FUNCTION public.update_digitals_measurements();

COMMIT;
