BEGIN;

-- 1. Rename column ONLY if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'creator_custom_rates' 
        AND column_name = 'price_per_week_cents'
    ) THEN
        ALTER TABLE public.creator_custom_rates 
        RENAME COLUMN price_per_week_cents TO price_per_month_cents;
    END IF;
END $$;

-- 2. Update Upsert Function to use the correct column and JSON key
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id UUID, p_rates JSONB)
RETURNS void AS $$
BEGIN
    -- Security check: ensure user can only update their own rates
    IF auth.uid() != p_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    -- First, delete all existing rates for this user
    DELETE FROM public.creator_custom_rates
    WHERE creator_id = p_creator_id;

    -- Then, insert the new ones from the JSONB array using price_per_month_cents
    INSERT INTO public.creator_custom_rates (creator_id, rate_type, rate_name, price_per_month_cents)
    SELECT
        p_creator_id,
        (rate->>'rate_type')::TEXT,
        (rate->>'rate_name')::TEXT,
        (rate->>'price_per_month_cents')::INT
    FROM jsonb_array_elements(p_rates) AS rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
