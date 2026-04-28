-- Backfill talent_name into package_snapshot.items for all existing packages
-- where talent_name is missing or empty, using the live agency_users data.
-- After this migration runs, the server-side read-time backfill is no longer needed.

UPDATE public.campaign_offer_packages cop
SET package_snapshot = jsonb_set(
  cop.package_snapshot,
  '{items}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (item->>'talent_name') IS NOT NULL AND (item->>'talent_name') != ''
        THEN item
        ELSE item || jsonb_build_object(
          'talent_name',
          COALESCE(
            NULLIF(au.stage_name, ''),
            NULLIF(au.full_legal_name, ''),
            'Unknown'
          )
        )
      END
    )
    FROM jsonb_array_elements(cop.package_snapshot->'items') AS item
    LEFT JOIN public.agency_users au
      ON au.id = (item->>'talent_id')::uuid
  )
)
WHERE cop.package_snapshot ? 'items'
  AND jsonb_array_length(cop.package_snapshot->'items') > 0;
