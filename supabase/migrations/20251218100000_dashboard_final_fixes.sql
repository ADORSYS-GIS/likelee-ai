-- Combined migration for Dashboard Pricing Alignment and RPC Fixes
BEGIN;

-- 1. Rename column in creator_custom_rates if it exists
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='creator_custom_rates' AND column_name='price_per_week_cents'
    ) THEN
        ALTER TABLE public.creator_custom_rates RENAME COLUMN price_per_week_cents TO price_per_month_cents;
    END IF;
END $$;

-- 2. Drop old versions of the function to ensure a clean state
DROP FUNCTION IF EXISTS public.upsert_creator_rates(UUID, JSONB);
DROP FUNCTION IF EXISTS public.upsert_creator_rates(TEXT, JSONB);

-- 3. Create the robust upsert function
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id TEXT, p_rates JSONB)
RETURNS void AS $$
DECLARE
    v_creator_id UUID;
BEGIN
    -- Cast p_creator_id to UUID
    v_creator_id := p_creator_id::UUID;

    -- Security check: ensure user can only update their own rates
    IF auth.uid() IS NOT NULL AND auth.uid() != v_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    -- Delete all existing rates for this user
    DELETE FROM public.creator_custom_rates
    WHERE creator_id = v_creator_id;

    -- Insert the new ones from the JSONB array
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
