-- Expose client_name and client_email from the package row in the public
-- package details response so the frontend can pre-fill the full assets
-- request without asking the recipient to type anything.

BEGIN;

DROP FUNCTION IF EXISTS get_public_package_details(TEXT);

CREATE OR REPLACE FUNCTION get_public_package_details(p_access_token TEXT)
RETURNS JSONB AS $
DECLARE
  result JSONB;
BEGIN
  SELECT
    jsonb_build_object(
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
      'client_name', p.client_name,
      'client_email', p.client_email,
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
      ), '[]'::jsonb),
      'items', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', it.id,
            'sort_order', it.sort_order,
            'talent_id', it.talent_id,
            'creator_id', it.creator_id,
            'relationship_id', it.relationship_id,
            'talent', COALESCE(
              (
                SELECT jsonb_build_object(
                  'id', u.id,
                  'stage_name', u.stage_name,
                  'full_legal_name', u.full_legal_name,
                  'full_name', NULL,
                  'profile_photo_url', u.profile_photo_url,
                  'bio_notes', u.bio_notes,
                  'city', u.city,
                  'race_ethnicity', u.race_ethnicity
                )
                FROM public.agency_users u
                WHERE u.id = it.talent_id
              ),
              (
                SELECT jsonb_build_object(
                  'id', c.id,
                  'stage_name', NULL,
                  'full_legal_name', NULL,
                  'full_name', c.full_name,
                  'profile_photo_url', c.profile_photo_url,
                  'bio_notes', NULL,
                  'city', c.city,
                  'race_ethnicity', c.race
                )
                FROM public.creators c
                WHERE c.id = it.creator_id
              )
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
                      (SELECT public_url FROM public.reference_images WHERE id = pa.asset_id LIMIT 1)
                    )
                  )
                )
              )
              FROM public.agency_talent_package_item_assets pa
              WHERE pa.item_id = it.id
            ), '[]'::jsonb)
          )
          ORDER BY it.sort_order
        )
        FROM public.agency_talent_package_items it
        WHERE it.package_id = p.id
      ), '[]'::jsonb)
    )
    INTO result
  FROM public.agency_talent_packages p
  WHERE p.access_token = p_access_token;

  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
