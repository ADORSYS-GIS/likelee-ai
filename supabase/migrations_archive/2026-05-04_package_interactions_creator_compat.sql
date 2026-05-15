-- 2026-05-04_package_interactions_creator_compat.sql
--
-- Problem: agency_talent_package_interactions.talent_id has a FK to
-- agency_users(id).  When an agency includes an independent connected creator
-- (who has no agency_users row) in a package, the brand's interaction
-- (favorite / callback / selected) fails with a FK violation because the
-- creator's UUID comes from the creators table, not agency_users.
--
-- Fix:
--   1. Drop the FK constraint on talent_id so it becomes a plain nullable UUID.
--      The column is kept for backward-compat with existing rows and queries.
--   2. Add a creator_id column (mirrors agency_talent_package_items) so
--      independent-creator interactions can be attributed correctly.
--   3. Rebuild the unique index and upsert function to cover both identity paths.

BEGIN;

-- 1. Drop the FK — talent_id becomes a plain nullable UUID.
ALTER TABLE public.agency_talent_package_interactions
  DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_talent_id_fkey;

-- 2. Add creator_id column (nullable, no FK — creators table is not always
--    accessible from the public/anon context that inserts interactions).
ALTER TABLE public.agency_talent_package_interactions
  ADD COLUMN IF NOT EXISTS creator_id uuid;

CREATE INDEX IF NOT EXISTS idx_atpi_interactions_creator_id
  ON public.agency_talent_package_interactions (creator_id);

-- 3. Rebuild the unique index to cover both identity paths.
--    An interaction is unique per (package, talent identity, type) for
--    favorite/callback/selected.  We use COALESCE so the index works
--    regardless of which identity column is populated.
DROP INDEX IF EXISTS unique_favorite_callback_interaction;

CREATE UNIQUE INDEX unique_favorite_callback_interaction
  ON public.agency_talent_package_interactions (
    package_id,
    COALESCE(talent_id, creator_id),  -- whichever identity is present
    type
  )
  WHERE type IN ('favorite', 'callback', 'selected');

-- 4. Replace the upsert function to handle both identity paths.
DROP FUNCTION IF EXISTS public.upsert_interaction(json);

CREATE OR REPLACE FUNCTION public.upsert_interaction(interaction_data json)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  v_package_id  uuid  := (interaction_data->>'package_id')::uuid;
  v_talent_id   uuid  := NULLIF(interaction_data->>'talent_id',  '')::uuid;
  v_creator_id  uuid  := NULLIF(interaction_data->>'creator_id', '')::uuid;
  v_type        text  := interaction_data->>'type';
  v_content     text  := interaction_data->>'content';
  v_client_name text  := interaction_data->>'client_name';
BEGIN
  INSERT INTO public.agency_talent_package_interactions
    (package_id, talent_id, creator_id, type, content, client_name)
  VALUES
    (v_package_id, v_talent_id, v_creator_id, v_type, v_content, v_client_name)
  ON CONFLICT (package_id, COALESCE(talent_id, creator_id), type)
    WHERE type IN ('favorite', 'callback', 'selected')
  DO NOTHING
  RETURNING to_jsonb(agency_talent_package_interactions.*) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
