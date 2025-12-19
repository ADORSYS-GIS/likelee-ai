BEGIN;

-- 1. Resolve PGRST203: Drop conflicting function signatures to avoid overloading ambiguity
DROP FUNCTION IF EXISTS public.upsert_creator_rates(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.upsert_creator_rates(UUID, JSONB);

-- 2. Rename column ONLY if it exists and hasn't been renamed yet
DO $$
BEGIN
    -- Check if 'price_per_week_cents' exists and 'price_per_month_cents' does NOT
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'creator_custom_rates' 
        AND column_name = 'price_per_week_cents'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'creator_custom_rates' 
        AND column_name = 'price_per_month_cents'
    ) THEN
        ALTER TABLE public.creator_custom_rates 
        RENAME COLUMN price_per_week_cents TO price_per_month_cents;
    END IF;
END $$;

-- 3. Recreate the function using UUID which is the correct type for creator_id
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id UUID, p_rates JSONB)
RETURNS void AS $$
BEGIN
    -- Security check: ensure user can only update their own rates
    -- Note: auth.uid() returns UUID, so matching against p_creator_id (UUID) is correct.
    IF auth.uid() != p_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    -- First, delete all existing rates for this user
    DELETE FROM public.creator_custom_rates
    WHERE creator_id = p_creator_id;

    -- Then, insert the new ones from the JSONB array
    INSERT INTO public.creator_custom_rates (creator_id, rate_type, rate_name, price_per_month_cents)
    SELECT
        p_creator_id,
        (rate->>'rate_type')::TEXT,
        (rate->>'rate_name')::TEXT,
        COALESCE(
            (rate->>'price_per_month_cents')::INT,
            (rate->>'price_per_week_cents')::INT,
            0
        )
    FROM jsonb_array_elements(p_rates) AS rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
