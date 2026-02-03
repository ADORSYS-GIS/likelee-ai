-- 0020_get_public_package_details_fix.sql
-- Fixes property naming to match frontend expectations (asset_url)
-- and ensures talent data is correctly joined with fallback logic.
-- REMOVED invalid references to u.city and u.race as they don't exist in agency_users table.

BEGIN;

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
        'agency', (SELECT jsonb_build_object('agency_name', a.agency_name, 'logo_url', a.logo_url) FROM agencies a WHERE a.id = p.agency_id),
        'interactions', (SELECT jsonb_agg(jsonb_build_object('talent_id', i.talent_id, 'type', i.type, 'content', i.content, 'client_name', i.client_name)) FROM agency_talent_package_interactions i WHERE i.package_id = p.id),
        'items', (SELECT jsonb_agg(
            jsonb_build_object(
                'id', i.id,
                'sort_order', i.sort_order,
                'talent', (
                    SELECT 
                        to_jsonb(u) || 
                        jsonb_build_object(
                            'full_name', COALESCE(u.stage_name, u.full_legal_name, c.full_name),
                            'profile_photo_url', COALESCE(u.profile_photo_url, c.profile_photo_url),
                            'city', c.city,
                            'race_ethnicity', c.race,
                            'bio', COALESCE(u.bio_notes, c.bio)
                        )
                    FROM agency_users u
                    LEFT JOIN creators c ON c.id = u.creator_id
                    WHERE u.id = i.talent_id
                ),
                'assets', (
                    SELECT jsonb_agg(
                       jsonb_build_object(
                            'id', pa.id,
                            'asset_id', pa.asset_id,
                            'asset_type', pa.asset_type,
                            'sort_order', pa.sort_order,
                            'asset_url', COALESCE(af.public_url, ri.public_url),
                            'asset', jsonb_build_object(
                                'id', pa.id,
                                'asset_url', COALESCE(af.public_url, ri.public_url),
                                'public_url', COALESCE(af.public_url, ri.public_url),
                                'file_name', COALESCE(af.file_name, ri.section_id)
                            )
                       )
                    ) 
                    FROM agency_talent_package_item_assets pa
                    LEFT JOIN agency_files af ON af.id = pa.asset_id AND pa.asset_type IN ('agency_file', 'image', 'video', 'agency_file')
                    LEFT JOIN reference_images ri ON ri.id = pa.asset_id AND pa.asset_type = 'reference_image'
                    WHERE pa.item_id = i.id
                    AND (af.id IS NOT NULL OR ri.id IS NOT NULL)
                )
            )
        ) FROM agency_talent_package_items i WHERE i.package_id = p.id)
    )
    INTO result
    FROM agency_talent_packages p
    WHERE p.access_token = p_access_token;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMIT;
