-- Backfill talent_name into package_snapshot.items for all existing packages
-- where talent_name is missing or empty, using the live agency_users data.
-- After this migration runs, the server-side read-time backfill is no longer needed.
--
-- Guards:
--   • Only touches rows where package_snapshot is a JSON object containing an
--     'items' key whose value is a JSON array (skips nulls, non-objects, non-arrays).
--   • Skips individual items whose talent_id is not a well-formed UUID by using
--     a safe cast via a helper expression rather than a hard ::uuid cast.
--   • Any item that cannot be resolved is left unchanged (COALESCE keeps the
--     original value when the JOIN finds nothing).

UPDATE public.campaign_offer_packages cop
SET package_snapshot = jsonb_set(
  cop.package_snapshot,
  '{items}',
  (
    SELECT jsonb_agg(
      CASE
        -- Item already has a non-empty talent_name — leave it alone.
        WHEN (item->>'talent_name') IS NOT NULL AND (item->>'talent_name') != ''
        THEN item
        -- talent_id is present and looks like a UUID — try to resolve a name.
        WHEN (item->>'talent_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN item || jsonb_build_object(
          'talent_name',
          COALESCE(
            NULLIF(au.stage_name, ''),
            NULLIF(au.full_legal_name, ''),
            -- No match found — keep whatever was there (may be null/missing).
            item->>'talent_name'
          )
        )
        -- talent_id is absent or not a UUID — leave item untouched.
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
  -- package_snapshot must be a JSON object (not null, not an array, etc.)
  jsonb_typeof(cop.package_snapshot) = 'object'
  -- it must have an 'items' key
  AND cop.package_snapshot ? 'items'
  -- that key must be a non-empty JSON array
  AND jsonb_typeof(cop.package_snapshot->'items') = 'array'
  AND jsonb_array_length(cop.package_snapshot->'items') > 0;
