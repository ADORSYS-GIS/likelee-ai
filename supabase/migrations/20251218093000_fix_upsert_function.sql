BEGIN;

-- 1. Drop the old function (important because PostgREST caches by signature)
DROP FUNCTION IF EXISTS public.upsert_creator_rates(UUID, JSONB);

-- 2. Re-create the function with p_creator_id as TEXT
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id TEXT, p_rates JSONB)
RETURNS void AS $$
DECLARE
    v_creator_id UUID;
BEGIN
    -- Cast p_creator_id to UUID
    v_creator_id := p_creator_id::UUID;

    -- Security check: ensure user can only update their own rates
    -- Note: When called via PostgREST with service role, auth.uid() might be null.
    -- If called via client bypass, we check.
    IF auth.uid() IS NOT NULL AND auth.uid() != v_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    -- First, delete all existing rates for this user
    DELETE FROM public.creator_custom_rates
    WHERE creator_id = v_creator_id;

    -- Then, insert the new ones from the JSONB array
    INSERT INTO public.creator_custom_rates (creator_id, rate_type, rate_name, price_per_month_cents)
    SELECT
        v_creator_id,
        (rate->>'rate_type')::TEXT,
        (rate->>'rate_name')::TEXT,
        (rate->>'price_per_month_cents')::INT
    FROM jsonb_array_elements(p_rates) AS rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
