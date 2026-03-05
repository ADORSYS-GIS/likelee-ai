BEGIN;

ALTER TABLE IF EXISTS public.agency_users
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS sports text;

ALTER TABLE public.agency_talent_packages
ADD COLUMN IF NOT EXISTS consent_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.agency_talent_package_interactions
DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_type_check;

ALTER TABLE public.agency_talent_package_interactions
ADD CONSTRAINT agency_talent_package_interactions_type_check
CHECK (type IN ('favorite', 'comment', 'callback', 'selected', 'consent'));

CREATE UNIQUE INDEX IF NOT EXISTS unique_package_consent_interaction
ON public.agency_talent_package_interactions (package_id, type)
WHERE type = 'consent';

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
        'consent_items', COALESCE(p.consent_items, '[]'::jsonb),
        'expires_at', p.expires_at,
        'access_token', p.access_token,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'agency', (
            SELECT jsonb_build_object('agency_name', a.agency_name, 'logo_url', a.logo_url)
            FROM public.agencies a
            WHERE a.id = p.agency_id
        ),
        'interactions', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'talent_id', i.talent_id,
                    'type', i.type,
                    'content', i.content,
                    'client_name', i.client_name,
                    'client_email', i.client_email,
                    'created_at', i.created_at
                )
            )
            FROM public.agency_talent_package_interactions i
            WHERE i.package_id = p.id
        ),
        'items', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', it.id,
                    'sort_order', it.sort_order,
                    'talent', (
                        SELECT jsonb_build_object(
                            'id', u.id,
                            'stage_name', u.stage_name,
                            'full_legal_name', u.full_legal_name,
                            'profile_photo_url', u.profile_photo_url,
                            'bio_notes', u.bio_notes,
                            'city', u.city,
                            'race_ethnicity', u.race_ethnicity
                        )
                        FROM public.agency_users u
                        WHERE u.id = it.talent_id
                    ),
                    'assets', COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', pa.id,
                                'asset_id', pa.asset_id,
                                'asset_type', pa.asset_type,
                                'sort_order', pa.sort_order,
                                'asset', jsonb_build_object(
                                    'id', pa.asset_id,
                                    'asset_url', COALESCE(
                                        (SELECT public_url FROM public.agency_files WHERE id = pa.asset_id),
                                        (SELECT public_url FROM public.reference_images WHERE id = pa.asset_id)
                                    )
                                )
                            )
                        )
                        FROM public.agency_talent_package_item_assets pa
                        WHERE pa.item_id = it.id
                    ), '[]'::jsonb)
                )
            )
            FROM public.agency_talent_package_items it
            WHERE it.package_id = p.id
        )
    )
    INTO result
    FROM public.agency_talent_packages p
    WHERE p.access_token = p_access_token;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
