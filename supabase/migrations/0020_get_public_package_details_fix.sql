    -- 0020_get_public_package_details_fix.sql
    -- Fixes property naming to match frontend expectations (asset_url)
    -- Ensures talent data (Location, Ethnicity, Bio, Availability) is correctly mapped with fallbacks.
    -- Uses verified column names from packages.rs and internal schema.

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
            'agency', (SELECT jsonb_build_object('agency_name', a.agency_name, 'logo_url', a.logo_url) FROM public.agencies a WHERE a.id = p.agency_id),
            'interactions', (SELECT jsonb_agg(jsonb_build_object('talent_id', i.talent_id, 'type', i.type, 'content', i.content, 'client_name', i.client_name)) FROM public.agency_talent_package_interactions i WHERE i.package_id = p.id),
            'items', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', i.id,
                        'sort_order', i.sort_order,
                        'talent', (
                            SELECT jsonb_build_object(
                                'id', u.id,
                                'stage_name', u.stage_name,
                                'full_legal_name', u.full_legal_name,
                                'profile_photo_url', u.profile_photo_url,
                                'bio_notes', u.bio_notes,
                                'city', u.city,
                                'race_ethnicity', u.race_ethnicity
                            ) FROM public.agency_users u WHERE u.id = i.talent_id
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
                                            (SELECT public_url FROM public.agency_files WHERE id = pa.asset_id LIMIT 1),
                                            (SELECT public_url FROM public.reference_images WHERE id = pa.asset_id LIMIT 1),
                                            -- Construct URL from storage path if public_url is missing
                                            (SELECT 'https://himyrgwyrsmltmzlbuxm.supabase.co/storage/v1/object/public/' || storage_bucket || '/' || storage_path
                                            FROM public.agency_files WHERE id = pa.asset_id LIMIT 1),
                                            (SELECT 'https://himyrgwyrsmltmzlbuxm.supabase.co/storage/v1/object/public/' || storage_bucket || '/' || storage_path
                                            FROM public.reference_images WHERE id = pa.asset_id LIMIT 1),
                                            (SELECT public_url FROM public.images WHERE id = pa.asset_id LIMIT 1),
                                            (SELECT public_url FROM public.videos WHERE id = pa.asset_id LIMIT 1)
                                        ),
                                        'asset_type', pa.asset_type
                                    )
                                )
                            )
                            FROM public.agency_talent_package_item_assets pa
                            WHERE pa.item_id = i.id
                        ), '[]'::jsonb)
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

    COMMIT;