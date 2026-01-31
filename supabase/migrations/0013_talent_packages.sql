-- 0013_talent_packages.sql
-- Subschema for Talent Packages (Portfolios)

BEGIN;

-- 1. Talent Packages Table
CREATE TABLE IF NOT EXISTS public.agency_talent_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Display Info
    title text NOT NULL,
    description text,
    cover_image_url text,
    
    -- Branding & Customization
    primary_color text,
    secondary_color text,
    custom_message text,
    
    -- Settings
    allow_comments boolean DEFAULT true,
    allow_favorites boolean DEFAULT true,
    allow_callbacks boolean DEFAULT true,
    
    -- Access Control
    password_hash text,
    expires_at timestamptz,
    access_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    
    -- Metadata
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_agency_id ON public.agency_talent_packages(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_access_token ON public.agency_talent_packages(access_token);

-- 2. Talent Selections in Package
CREATE TABLE IF NOT EXISTS public.agency_talent_package_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id uuid NOT NULL REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
    talent_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    sort_order integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atpi_package_id ON public.agency_talent_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_atpi_talent_id ON public.agency_talent_package_items(talent_id);

-- 3. Asset Selections for each Talent in Package
CREATE TABLE IF NOT EXISTS public.agency_talent_package_item_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES public.agency_talent_package_items(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL, -- Flexible reference depending on asset_type
    asset_type text NOT NULL CHECK (asset_type IN ('reference_image', 'agency_file')),
    sort_order integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atpia_item_id ON public.agency_talent_package_item_assets(item_id);

-- 4. Package Interactions (Client Side)
CREATE TABLE IF NOT EXISTS public.agency_talent_package_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id uuid NOT NULL REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
    talent_id uuid REFERENCES public.creators(id) ON DELETE SET NULL, -- Null if general comment
    type text NOT NULL CHECK (type IN ('favorite', 'comment', 'callback')),
    content text,
    client_name text,
    client_email text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atp_interactions_package ON public.agency_talent_package_interactions(package_id);

-- 5. Package Statistics (Views)
CREATE TABLE IF NOT EXISTS public.agency_talent_package_stats (
    package_id uuid PRIMARY KEY REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
    view_count integer DEFAULT 0,
    last_viewed_at timestamptz DEFAULT now(),
    unique_visitors integer DEFAULT 0
);

-- RLS POLICIES

ALTER TABLE public.agency_talent_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_talent_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_talent_package_item_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_talent_package_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_talent_package_stats ENABLE ROW LEVEL SECURITY;

-- 1. Agencies can manage their own packages
DROP POLICY IF EXISTS "Agency members manage own packages" ON public.agency_talent_packages;
CREATE POLICY "Agency members manage own packages" ON public.agency_talent_packages
    FOR ALL USING (auth.uid() = agency_id);

-- 2. Public can view package details ONLY if access_token is provided (via API/Handlers)
-- In RLS, we can allow lookup by access_token for select
DROP POLICY IF EXISTS "Public access via token" ON public.agency_talent_packages;
CREATE POLICY "Public access via token" ON public.agency_talent_packages
    FOR SELECT USING (true); -- We will enforce access_token check in the API layer or specific where clauses

-- 3. Items and Assets follow the package visibility
DROP POLICY IF EXISTS "Package items visibility" ON public.agency_talent_package_items;
CREATE POLICY "Package items visibility" ON public.agency_talent_package_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_talent_packages
            WHERE id = package_id AND (agency_id = auth.uid() OR true)
        )
    );

DROP POLICY IF EXISTS "Package assets visibility" ON public.agency_talent_package_item_assets;
CREATE POLICY "Package assets visibility" ON public.agency_talent_package_item_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_talent_package_items i
            JOIN public.agency_talent_packages p ON p.id = i.package_id
            WHERE i.id = item_id AND (p.agency_id = auth.uid() OR true)
        )
    );

-- 4. Interactions: Agencies can view all, Public can insert
DROP POLICY IF EXISTS "Interactions agency select" ON public.agency_talent_package_interactions;
CREATE POLICY "Interactions agency select" ON public.agency_talent_package_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_talent_packages
            WHERE id = package_id AND agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Interactions public insert" ON public.agency_talent_package_interactions;
CREATE POLICY "Interactions public insert" ON public.agency_talent_package_interactions
    FOR INSERT WITH CHECK (true);

-- 5. Stats
DROP POLICY IF EXISTS "Stats agency select" ON public.agency_talent_package_stats;
CREATE POLICY "Stats agency select" ON public.agency_talent_package_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_talent_packages
            WHERE id = package_id AND agency_id = auth.uid()
        )
    );

COMMIT;
