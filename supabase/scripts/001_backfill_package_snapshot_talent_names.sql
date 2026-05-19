BEGIN;
UPDATE public.campaign_offer_packages cop
SET package_snapshot = jsonb_set(
  cop.package_snapshot,
  '{items}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN (item->>'talent_name') IS NOT NULL AND (item->>'talent_name') != ''
        THEN item
        WHEN (item->>'talent_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN item || jsonb_build_object(
          'talent_name',
          COALESCE(
            NULLIF(au.stage_name, ''),
            NULLIF(au.full_legal_name, ''),
            item->>'talent_name'
          )
        )
        ELSE item
      END
    )
    FROM jsonb_array_elements(cop.package_snapshot->'items') AS item
    LEFT JOIN public.agency_users au
      ON (item->>'talent_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     AND au.id = (item->>'talent_id')::uuid
  )
)
WHERE
  jsonb_typeof(cop.package_snapshot) = 'object'
  AND cop.package_snapshot ? 'items'
  AND jsonb_typeof(cop.package_snapshot->'items') = 'array'
  AND jsonb_array_length(cop.package_snapshot->'items') > 0;
COMMIT;
