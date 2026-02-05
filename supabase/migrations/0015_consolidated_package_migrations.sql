-- This migration consolidates all package-related schema changes from migrations 0015 through 0023.

BEGIN;

-- From 0015: Add template support
ALTER TABLE public.agency_talent_packages
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.agency_talent_packages(id) ON DELETE SET NULL;

ALTER TABLE public.agency_talent_packages
ALTER COLUMN client_name DROP NOT NULL,
ALTER COLUMN client_email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_packages_is_template ON public.agency_talent_packages(agency_id, is_template);
CREATE INDEX IF NOT EXISTS idx_packages_template_id ON public.agency_talent_packages(template_id) WHERE template_id IS NOT NULL;

-- From 0017 & 0018: Correct foreign key constraints
ALTER TABLE public.agency_talent_package_items
DROP CONSTRAINT IF EXISTS agency_talent_package_items_talent_id_fkey;

ALTER TABLE public.agency_talent_package_items
ADD CONSTRAINT agency_talent_package_items_talent_id_fkey
FOREIGN KEY (talent_id) REFERENCES public.agency_users(id) ON DELETE CASCADE;

ALTER TABLE public.agency_talent_package_interactions
DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_talent_id_fkey;

ALTER TABLE public.agency_talent_package_interactions
ADD CONSTRAINT agency_talent_package_interactions_talent_id_fkey
FOREIGN KEY (talent_id) REFERENCES public.agency_users(id) ON DELETE SET NULL;

-- From 0019: Add unique constraint and upsert function for interactions
ALTER TABLE public.agency_talent_package_interactions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS unique_favorite_callback_interaction
ON public.agency_talent_package_interactions (package_id, talent_id, type)
WHERE type IN ('favorite', 'callback');

DROP FUNCTION IF EXISTS public.upsert_interaction(json);
CREATE OR REPLACE FUNCTION public.upsert_interaction(interaction_data json)
RETURNS jsonb AS $$
DECLARE
    p_package_id UUID := (interaction_data->>'package_id')::uuid;
    p_talent_id UUID := (interaction_data->>'talent_id')::uuid;
    p_type TEXT := interaction_data->>'type';
    result jsonb;
BEGIN
    INSERT INTO public.agency_talent_package_interactions (package_id, talent_id, type, content, client_name)
    VALUES (p_package_id, p_talent_id, p_type, interaction_data->>'content', interaction_data->>'client_name')
    ON CONFLICT (package_id, talent_id, type) WHERE type IN ('favorite', 'callback')
    DO NOTHING
    RETURNING to_jsonb(agency_talent_package_interactions.*) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- From 0020: Update public package details function
DROP FUNCTION IF EXISTS get_public_package_details(TEXT);
CREATE OR REPLACE FUNCTION get_public_package_details(p_access_token TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'agency_id', p.agency_id,
        'title', p.title,
        'description', p.description,
        'cover_image_url', p.cover_image_url,
        'primary_color', p.primary_color,
        'secondary_color', p.secondary_color,
        'custom_message', p.custom_message,
        'allow_comments', p.allow_comments,
        'allow_favorites', p.allow_favorites,
        'allow_callbacks', p.allow_callbacks,
        'expires_at', p.expires_at,
        'access_token', p.access_token,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'agency', (SELECT jsonb_build_object('agency_name', a.agency_name, 'logo_url', a.logo_url) FROM public.agencies a WHERE a.id = p.agency_id),
        'interactions', (SELECT jsonb_agg(jsonb_build_object('talent_id', i.talent_id, 'type', i.type, 'content', i.content, 'client_name', i.client_name)) FROM public.agency_talent_package_interactions i WHERE i.package_id = p.id),
        'items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', i.id,
                    'sort_order', i.sort_order,
                    'talent', (SELECT jsonb_build_object('id', u.id, 'stage_name', u.stage_name, 'full_legal_name', u.full_legal_name, 'profile_photo_url', u.profile_photo_url, 'bio_notes', u.bio_notes, 'city', u.city, 'race_ethnicity', u.race_ethnicity) FROM public.agency_users u WHERE u.id = i.talent_id),
                    'assets', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pa.id, 'asset_id', pa.asset_id, 'asset_type', pa.asset_type, 'sort_order', pa.sort_order, 'asset', jsonb_build_object('id', pa.asset_id, 'asset_url', COALESCE((SELECT public_url FROM public.agency_files WHERE id = pa.asset_id), (SELECT public_url FROM public.reference_images WHERE id = pa.asset_id))))) FROM public.agency_talent_package_item_assets pa WHERE pa.item_id = i.id), '[]'::jsonb)
                )
            ) 
            FROM public.agency_talent_package_items i 
            WHERE i.package_id = p.id
        )
    )
    INTO result
    FROM public.agency_talent_packages p
    WHERE p.access_token = p_access_token;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- From 0021: Add password protection
ALTER TABLE public.agency_talent_packages
ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE;

-- From 0022: Allow 'selected' interaction type
ALTER TABLE public.agency_talent_package_interactions
DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_type_check;

ALTER TABLE public.agency_talent_package_interactions
ADD CONSTRAINT agency_talent_package_interactions_type_check
CHECK (type IN ('favorite', 'comment', 'callback', 'selected'));

-- From 0023: Correct agency package stats function
DROP FUNCTION IF EXISTS public.get_agency_package_stats(uuid);
CREATE OR REPLACE FUNCTION public.get_agency_package_stats(p_agency_id uuid)
RETURNS TABLE (total_views bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(SUM(s.view_count), 0)::bigint as total_views
    FROM public.agency_talent_packages p
    LEFT JOIN public.agency_talent_package_stats s ON s.package_id = p.id
    WHERE p.agency_id = p_agency_id AND p.is_template = false AND p.client_name IS NOT NULL
    GROUP BY p.agency_id;
END;
$$;

COMMIT;
