BEGIN;

-- 1. Rename price_per_week_cents to price_per_month_cents in creator_custom_rates
-- We use a DO block to make it idempotent if the rename was already done
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'creator_custom_rates' AND column_name = 'price_per_week_cents'
    ) THEN
        ALTER TABLE public.creator_custom_rates RENAME COLUMN price_per_week_cents TO price_per_month_cents;
    END IF;
END $$;

-- 2. Ensure content_types and industries exist in profiles table
-- These are used to persist the selection of content types and industries a creator works with
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS content_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}';

-- 3. Update the upsert_creator_rates function to use price_per_month_cents
-- This function handles batch updates of custom rates for a creator
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id UUID, p_rates JSONB)
RETURNS void AS $$
BEGIN
    -- Security check: ensure user can only update their own rates
    IF auth.uid() != p_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    -- First, delete all existing rates for this user
    -- Rates are now primarily for content types the creator is open to
    DELETE FROM public.creator_custom_rates
    WHERE creator_id = p_creator_id;

    -- Then, insert the new ones from the JSONB array
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
