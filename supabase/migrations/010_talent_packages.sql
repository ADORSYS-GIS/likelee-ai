-- 010_talent_packages.sql
-- Consolidated migration for talent packages
-- Source files: 0013_talent_packages_core.sql, 0014_talent_packages_helpers.sql,
-- 0014_package_asset_view_fix.sql, 0015_consolidated_package_migrations.sql,
-- 0020_get_public_package_details_fix.sql, 2026-03-03_package_consent.sql,
-- 2026-03-10_offer_talent_assignments_unique.sql, 2026-04-15_get_public_package_details_creator_fallback.sql,
-- 2026-04-20_atp_asset_request_interaction.sql, 2026-04-28_get_public_package_details_add_client_fields.sql,
-- 2026-05-04_get_public_package_details_add_creator_id.sql, 2026-05-04_package_interactions_creator_compat.sql

BEGIN;

-- ============================================================================
-- 1. AGENCY TALENT PACKAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_talent_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Package Info
    name text,
    title text,
    description text,
    
    -- Template flag
    is_template boolean DEFAULT false,
    template_id uuid REFERENCES public.agency_talent_packages(id) ON DELETE SET NULL,
    
    -- Pricing
    price_cents integer,
    currency text DEFAULT 'USD',
    
    -- Media
    cover_photo_url text,
    cover_image_url text,
    primary_color text,
    secondary_color text,
    custom_message text,
    
    -- Consent
    consent_required boolean DEFAULT false,
    consent_text text,
    consent_items text[] DEFAULT '{}',
    allow_comments boolean DEFAULT true,
    allow_favorites boolean DEFAULT true,
    allow_callbacks boolean DEFAULT true,
    
    -- Categories
    category text,
    organization text,
    sports text,
    
    -- Client info (nullable)
    client_name text,
    client_email text,
    expires_at timestamptz,
    access_token text DEFAULT gen_random_uuid()::text,
    password_protected boolean DEFAULT false,
    password_hash text,
    
    -- Status
    is_active boolean DEFAULT true,
    
    -- Metadata
    meta jsonb DEFAULT '{}'::jsonb,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_agency ON public.agency_talent_packages(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_template ON public.agency_talent_packages(template_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_active ON public.agency_talent_packages(agency_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_category ON public.agency_talent_packages(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_talent_packages_access_token ON public.agency_talent_packages(access_token);

ALTER TABLE public.agency_talent_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own packages" ON public.agency_talent_packages;
CREATE POLICY "Agencies can view own packages" ON public.agency_talent_packages
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own packages" ON public.agency_talent_packages;
CREATE POLICY "Agencies can manage own packages" ON public.agency_talent_packages
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 2. AGENCY TALENT PACKAGE ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_talent_package_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id uuid NOT NULL REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Subject (multiple identity support - talent_id can be null)
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    relationship_id uuid REFERENCES public.agency_talent_relationships(id) ON DELETE SET NULL,
    
    -- Item Details
    item_type text NOT NULL DEFAULT 'talent', -- 'talent', 'asset', 'custom'
    title text,
    description text,
    
    -- Pricing override
    price_cents integer,
    
    -- Media
    media_urls text[],
    
    -- Display order
    sort_order integer DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_talent_package_items_package ON public.agency_talent_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_items_agency ON public.agency_talent_package_items(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_items_talent ON public.agency_talent_package_items(talent_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_items_creator ON public.agency_talent_package_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_items_relationship ON public.agency_talent_package_items(relationship_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_items_sort ON public.agency_talent_package_items(package_id, sort_order);

CREATE OR REPLACE FUNCTION public.set_agency_talent_package_item_agency_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agency_id uuid;
BEGIN
    SELECT p.agency_id
    INTO v_agency_id
    FROM public.agency_talent_packages p
    WHERE p.id = NEW.package_id;

    IF v_agency_id IS NULL THEN
        RAISE EXCEPTION 'Package % does not exist or has no agency_id', NEW.package_id;
    END IF;

    NEW.agency_id := v_agency_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_agency_talent_package_item_agency_id
    ON public.agency_talent_package_items;
CREATE TRIGGER set_agency_talent_package_item_agency_id
    BEFORE INSERT OR UPDATE OF package_id ON public.agency_talent_package_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_agency_talent_package_item_agency_id();


ALTER TABLE public.agency_talent_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own package items" ON public.agency_talent_package_items;
CREATE POLICY "Agencies can view own package items" ON public.agency_talent_package_items
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own package items" ON public.agency_talent_package_items;
CREATE POLICY "Agencies can manage own package items" ON public.agency_talent_package_items
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 3. AGENCY TALENT PACKAGE ITEM ASSETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_talent_package_item_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.agency_talent_package_items(id) ON DELETE CASCADE,
    asset_id uuid,
    
    -- Asset Details
    asset_type text NOT NULL, -- 'photo', 'video', 'digitals', 'voice'
    storage_bucket text,
    storage_path text,
    public_url text,
    
    -- Metadata
    file_name text,
    mime_type text,
    size_bytes bigint,
    width integer,
    height integer,
    duration_sec integer, -- for videos/voice
    
    sort_order integer DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_talent_package_item_assets_item ON public.agency_talent_package_item_assets(item_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_item_assets_asset ON public.agency_talent_package_item_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_item_assets_sort ON public.agency_talent_package_item_assets(item_id, sort_order);

ALTER TABLE public.agency_talent_package_item_assets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. AGENCY TALENT PACKAGE INTERACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_talent_package_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id uuid NOT NULL REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
    
    -- Subject (creator identity support)
    creator_id uuid REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Interaction Details
    interaction_type text NOT NULL CHECK (interaction_type IN ('view', 'share', 'download', 'interest', 'asset_request', 'favorite', 'callback', 'selected', 'consent')),
    "type" text,
    
    -- For asset_request type
    item_id uuid REFERENCES public.agency_talent_package_items(id) ON DELETE SET NULL,
    request_message text,
    content text,
    client_name text,
    client_email text,
    
    -- Metadata
    ip_address inet,
    user_agent text,
    referrer text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE public.agency_talent_package_interactions
    DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_interaction_type_check,
    ADD CONSTRAINT agency_talent_package_interactions_interaction_type_check
        CHECK (interaction_type IN ('view', 'share', 'download', 'interest', 'asset_request', 'favorite', 'callback', 'selected', 'consent'));

CREATE OR REPLACE FUNCTION public.normalize_agency_talent_package_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.interaction_type := COALESCE(NULLIF(NEW.interaction_type, ''), NULLIF(NEW."type", ''));
    NEW."type" := COALESCE(NULLIF(NEW."type", ''), NEW.interaction_type);
    NEW.request_message := COALESCE(NEW.request_message, NEW.content);
    NEW.content := COALESCE(NEW.content, NEW.request_message);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_agency_talent_package_interaction
    ON public.agency_talent_package_interactions;
CREATE TRIGGER normalize_agency_talent_package_interaction
    BEFORE INSERT OR UPDATE ON public.agency_talent_package_interactions
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_agency_talent_package_interaction();

CREATE INDEX IF NOT EXISTS idx_agency_talent_package_interactions_package ON public.agency_talent_package_interactions(package_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_interactions_creator ON public.agency_talent_package_interactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_interactions_type ON public.agency_talent_package_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_agency_talent_package_interactions_created ON public.agency_talent_package_interactions(created_at DESC);

ALTER TABLE public.agency_talent_package_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own package interactions" ON public.agency_talent_package_interactions;
CREATE POLICY "Agencies can view own package interactions" ON public.agency_talent_package_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_talent_packages p
            WHERE p.id = package_id AND p.agency_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. AGENCY TALENT PACKAGE STATS (materialized view stats cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_talent_package_stats (
    package_id uuid PRIMARY KEY REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Stats
    view_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    interest_count integer DEFAULT 0,
    asset_request_count integer DEFAULT 0,
    
    -- Unique viewers
    unique_viewers integer DEFAULT 0,
    
    -- Last activity
    last_viewed_at timestamptz,
    
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_talent_package_stats_agency ON public.agency_talent_package_stats(agency_id);

ALTER TABLE public.agency_talent_package_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own package stats" ON public.agency_talent_package_stats;
CREATE POLICY "Agencies can view own package stats" ON public.agency_talent_package_stats
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Increment package view
CREATE OR REPLACE FUNCTION public.increment_package_view(
    p_package_id UUID,
    p_creator_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert interaction
    INSERT INTO public.agency_talent_package_interactions (
        package_id, creator_id, interaction_type,
        ip_address, user_agent, referrer
    ) VALUES (
        p_package_id, p_creator_id, 'view',
        p_ip_address, p_user_agent, p_referrer
    );
    
    -- Update stats
    INSERT INTO public.agency_talent_package_stats (
        package_id, agency_id, view_count, last_viewed_at, updated_at
    )
    SELECT 
        p_package_id, p.agency_id, 1, now(), now()
    FROM public.agency_talent_packages p
    WHERE p.id = p_package_id
    ON CONFLICT (package_id) DO UPDATE SET
        view_count = public.agency_talent_package_stats.view_count + 1,
        last_viewed_at = now(),
        updated_at = now();
END;
$$;

-- Get agency package stats
CREATE OR REPLACE FUNCTION public.get_agency_package_stats(p_agency_id UUID)
RETURNS TABLE (
    package_id UUID,
    total_views BIGINT,
    total_shares BIGINT,
    total_downloads BIGINT,
    total_interests BIGINT,
    total_asset_requests BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        p.id as package_id,
        COALESCE(s.view_count, 0) as total_views,
        COALESCE(s.share_count, 0) as total_shares,
        COALESCE(s.download_count, 0) as total_downloads,
        COALESCE(s.interest_count, 0) as total_interests,
        COALESCE(s.asset_request_count, 0) as total_asset_requests
    FROM public.agency_talent_packages p
    LEFT JOIN public.agency_talent_package_stats s ON s.package_id = p.id
    WHERE p.agency_id = p_agency_id;
$$;

-- Upsert interaction
CREATE OR REPLACE FUNCTION public.upsert_interaction(
    p_package_id UUID,
    p_interaction_type TEXT,
    p_creator_id UUID DEFAULT NULL,
    p_item_id UUID DEFAULT NULL,
    p_request_message TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_interaction_id UUID;
BEGIN
    INSERT INTO public.agency_talent_package_interactions (
        package_id, creator_id, interaction_type, item_id, request_message,
        ip_address, user_agent, referrer
    ) VALUES (
        p_package_id, p_creator_id, p_interaction_type, p_item_id, p_request_message,
        p_ip_address, p_user_agent, p_referrer
    )
    RETURNING id INTO v_interaction_id;
    
    -- Update stats based on type
    INSERT INTO public.agency_talent_package_stats (
        package_id, agency_id, view_count, share_count, download_count,
        interest_count, asset_request_count, updated_at
    )
    SELECT 
        p_package_id, p.agency_id,
        CASE WHEN p_interaction_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'share' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'download' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'interest' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'asset_request' THEN 1 ELSE 0 END,
        now()
    FROM public.agency_talent_packages p
    WHERE p.id = p_package_id
    ON CONFLICT (package_id) DO UPDATE SET
        view_count = public.agency_talent_package_stats.view_count + 
            CASE WHEN p_interaction_type = 'view' THEN 1 ELSE 0 END,
        share_count = public.agency_talent_package_stats.share_count + 
            CASE WHEN p_interaction_type = 'share' THEN 1 ELSE 0 END,
        download_count = public.agency_talent_package_stats.download_count + 
            CASE WHEN p_interaction_type = 'download' THEN 1 ELSE 0 END,
        interest_count = public.agency_talent_package_stats.interest_count + 
            CASE WHEN p_interaction_type = 'interest' THEN 1 ELSE 0 END,
        asset_request_count = public.agency_talent_package_stats.asset_request_count + 
            CASE WHEN p_interaction_type = 'asset_request' THEN 1 ELSE 0 END,
        updated_at = now();
    
    RETURN v_interaction_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.upsert_interaction(interaction_data jsonb)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_interaction_id UUID;
    v_package_id UUID;
    v_creator_id UUID;
    v_item_id UUID;
    v_interaction_type TEXT;
    v_request_message TEXT;
BEGIN
    v_package_id := NULLIF(interaction_data->>'package_id', '')::uuid;
    v_creator_id := CASE
        WHEN COALESCE(interaction_data->>'creator_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (interaction_data->>'creator_id')::uuid
        ELSE NULL
    END;
    v_item_id := CASE
        WHEN COALESCE(interaction_data->>'item_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (interaction_data->>'item_id')::uuid
        ELSE NULL
    END;
    v_interaction_type := COALESCE(NULLIF(interaction_data->>'interaction_type', ''), NULLIF(interaction_data->>'type', ''));
    v_request_message := COALESCE(interaction_data->>'request_message', interaction_data->>'content');

    INSERT INTO public.agency_talent_package_interactions (
        package_id, creator_id, interaction_type, "type", item_id, request_message,
        content, client_name, client_email, ip_address, user_agent, referrer
    ) VALUES (
        v_package_id,
        v_creator_id,
        v_interaction_type,
        v_interaction_type,
        v_item_id,
        v_request_message,
        interaction_data->>'content',
        interaction_data->>'client_name',
        interaction_data->>'client_email',
        NULLIF(interaction_data->>'ip_address', '')::inet,
        interaction_data->>'user_agent',
        interaction_data->>'referrer'
    )
    RETURNING id INTO v_interaction_id;

    INSERT INTO public.agency_talent_package_stats (
        package_id, agency_id, view_count, share_count, download_count,
        interest_count, asset_request_count, updated_at
    )
    SELECT
        v_package_id, p.agency_id,
        CASE WHEN v_interaction_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type = 'share' THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type = 'download' THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type IN ('interest', 'favorite', 'callback', 'selected') THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type = 'asset_request' THEN 1 ELSE 0 END,
        now()
    FROM public.agency_talent_packages p
    WHERE p.id = v_package_id
    ON CONFLICT (package_id) DO UPDATE SET
        view_count = public.agency_talent_package_stats.view_count +
            CASE WHEN v_interaction_type = 'view' THEN 1 ELSE 0 END,
        share_count = public.agency_talent_package_stats.share_count +
            CASE WHEN v_interaction_type = 'share' THEN 1 ELSE 0 END,
        download_count = public.agency_talent_package_stats.download_count +
            CASE WHEN v_interaction_type = 'download' THEN 1 ELSE 0 END,
        interest_count = public.agency_talent_package_stats.interest_count +
            CASE WHEN v_interaction_type IN ('interest', 'favorite', 'callback', 'selected') THEN 1 ELSE 0 END,
        asset_request_count = public.agency_talent_package_stats.asset_request_count +
            CASE WHEN v_interaction_type = 'asset_request' THEN 1 ELSE 0 END,
        updated_at = now();

    RETURN v_interaction_id;
END;
$$;


-- ============================================================================
-- 7. GET PUBLIC PACKAGE DETAILS (latest from 2026-05-04)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_package_details(p_access_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT
    jsonb_build_object(
      'id', p.id,
      'agency_id', p.agency_id,
      'name', p.name,
      'description', p.description,
      'cover_photo_url', p.cover_photo_url,
      'is_template', p.is_template,
      'price_cents', p.price_cents,
      'currency', p.currency,
      'category', p.category,
      'organization', p.organization,
      'sports', p.sports,
      'client_name', p.client_name,
      'client_email', p.client_email,
      'consent_required', p.consent_required,
      'consent_text', p.consent_text,
      'meta', p.meta,
      'is_active', p.is_active,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'agency', (
        SELECT jsonb_build_object('agency_name', a.agency_name, 'logo_url', a.logo_url)
        FROM public.agencies a
        WHERE a.id = p.agency_id
      ),
      'interactions', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'creator_id', i.creator_id,
            'interaction_type', i.interaction_type,
            'item_id', i.item_id,
            'request_message', i.request_message,
            'created_at', i.created_at
          )
        )
        FROM public.agency_talent_package_interactions i
        WHERE i.package_id = p.id
      ), '[]'::jsonb),
      'items', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', it.id,
            'talent_id', it.talent_id,
            'creator_id', it.creator_id,
            'relationship_id', it.relationship_id,
            'item_type', it.item_type,
            'title', it.title,
            'description', it.description,
            'price_cents', it.price_cents,
            'media_urls', it.media_urls,
            'sort_order', it.sort_order,
            'talent', COALESCE(
              (
                SELECT jsonb_build_object(
                  'id', u.id, 'stage_name', u.stage_name,
                  'full_legal_name', u.full_legal_name,
                  'profile_photo_url', u.profile_photo_url,
                  'bio_notes', u.bio_notes, 'city', u.city
                )
                FROM public.agency_users u WHERE u.id = it.talent_id
              ),
              (
                SELECT jsonb_build_object(
                  'id', c.id, 'full_name', c.full_name,
                  'profile_photo_url', c.profile_photo_url, 'city', c.city
                )
                FROM public.creators c WHERE c.id = it.creator_id
              )
            ),
            'assets', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', pa.id, 'asset_type', pa.asset_type,
                  'public_url', pa.public_url, 'sort_order', pa.sort_order
                ) ORDER BY pa.sort_order
              )
              FROM public.agency_talent_package_item_assets pa
              WHERE pa.item_id = it.id
            ), '[]'::jsonb)
          ) ORDER BY it.sort_order
        )
        FROM public.agency_talent_package_items it
        WHERE it.package_id = p.id
      ), '[]'::jsonb)
    )
    INTO result
  FROM public.agency_talent_packages p
  WHERE p.id = (
    SELECT package_id FROM public.agency_talent_package_interactions
    WHERE id = CASE
      WHEN p_access_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN p_access_token::uuid
      ELSE NULL
    END
    LIMIT 1
  ) OR p.access_token = p_access_token
    OR p.meta->>'access_token' = p_access_token;

  RETURN result;
END;
$$;

COMMIT;
