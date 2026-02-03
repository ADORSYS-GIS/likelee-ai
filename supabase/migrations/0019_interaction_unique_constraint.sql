-- CONSOLIDATED MIGRATION FOR PACKAGE INTERACTION LOGIC

-- Step 1: Clean up any previous, incorrect versions of the function
DROP FUNCTION IF EXISTS public.upsert_interaction(interaction_data jsonb);
DROP FUNCTION IF EXISTS public.upsert_interaction(interaction_data json);

-- Step 2: Clean up the old index in case it was created incorrectly
DROP INDEX IF EXISTS unique_favorite_callback_interaction;

-- Step 3: Add the missing 'updated_at' column if it doesn't exist
ALTER TABLE public.agency_talent_package_interactions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 4: Re-create the unique index correctly
CREATE UNIQUE INDEX unique_favorite_callback_interaction
ON public.agency_talent_package_interactions (package_id, talent_id, type)
WHERE type IN ('favorite', 'callback');

-- Step 5: Create the final, correct version of the upsert function that manually checks for conflicts
CREATE OR REPLACE FUNCTION public.upsert_interaction(interaction_data json)
RETURNS jsonb AS $$
DECLARE
    p_package_id UUID := (interaction_data->>'package_id')::uuid;
    p_talent_id UUID := (interaction_data->>'talent_id')::uuid;
    p_type TEXT := interaction_data->>'type';
    existing_id UUID;
    result jsonb;
BEGIN
    -- Manually check if a conflicting row exists
    SELECT id INTO existing_id
    FROM public.agency_talent_package_interactions
    WHERE package_id = p_package_id
      AND talent_id = p_talent_id
      AND type = p_type;

    -- If no conflicting row is found, insert the new record
    IF NOT FOUND THEN
        INSERT INTO public.agency_talent_package_interactions (
            package_id,
            talent_id,
            type,
            content,
            client_name
        )
        VALUES (
            p_package_id,
            p_talent_id,
            p_type,
            interaction_data->>'content',
            interaction_data->>'client_name'
        )
        RETURNING to_jsonb(agency_talent_package_interactions.*) INTO result;
    END IF;

    -- Return the new record if inserted, otherwise return null
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add a comment to the function to force a schema reload for the API
COMMENT ON FUNCTION public.upsert_interaction(json) IS 'Manually upserts a package interaction to avoid ON CONFLICT issues.';