-- 0004_business_logic_and_pricing.sql
-- Combined migration for rates, rules, and negotiations

BEGIN;

-- 1. Add business logic columns to creators
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS accept_negotiations boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_restrictions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_exclusivity text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}';

-- 2. Creator custom rates table
CREATE TABLE IF NOT EXISTS public.creator_custom_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  rate_type text NOT NULL, -- 'content_type' or 'industry'
  rate_name text NOT NULL,
  price_per_month_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(creator_id, rate_type, rate_name)
);

-- Indexes for creator_custom_rates
CREATE INDEX IF NOT EXISTS idx_creator_custom_rates_creator ON public.creator_custom_rates(creator_id);

-- RLS for creator_custom_rates
ALTER TABLE public.creator_custom_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select rates" ON public.creator_custom_rates;
CREATE POLICY "Public select rates" 
ON public.creator_custom_rates 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Creators can modify their own rates" ON public.creator_custom_rates;
CREATE POLICY "Creators can modify their own rates" 
ON public.creator_custom_rates 
FOR ALL 
USING (auth.uid() = creator_id);

-- 3. Upsert function for creator rates
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id UUID, p_rates JSONB)
RETURNS void AS $$
BEGIN
    IF auth.uid() != p_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    DELETE FROM public.creator_custom_rates
    WHERE creator_id = p_creator_id;

    INSERT INTO public.creator_custom_rates (creator_id, rate_type, rate_name, price_per_month_cents)
    SELECT
        p_creator_id,
        (rate->>'rate_type')::TEXT,
        CASE
            WHEN lower(trim(replace((rate->>'rate_name')::TEXT, '-', ' '))) IN ('social media ads', 'social medial ads') THEN 'Social media ads'
            ELSE (rate->>'rate_name')::TEXT
        END,
        COALESCE(
            (rate->>'price_per_month_cents')::INT,
            (rate->>'price_per_week_cents')::INT,
            0
        )
    FROM jsonb_array_elements(p_rates) AS rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
