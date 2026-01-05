BEGIN;

WITH to_delete AS (
    SELECT id
    FROM (
        SELECT
            id,
            creator_id,
            rate_type,
            updated_at,
            ROW_NUMBER() OVER(
                PARTITION BY creator_id, rate_type 
                ORDER BY updated_at DESC
            ) as rn
        FROM public.creator_custom_rates
        WHERE lower(trim(replace(rate_name, '-', ' '))) IN ('social media ads', 'social medial ads')
    ) as ranked_rates
    WHERE rn > 1
)
DELETE FROM public.creator_custom_rates
WHERE id IN (SELECT id FROM to_delete);

UPDATE public.creator_custom_rates
SET rate_name = 'Social media ads'
WHERE lower(trim(replace(rate_name, '-', ' '))) IN ('social media ads', 'social medial ads');


UPDATE public.profiles
SET content_types = ARRAY(
    SELECT DISTINCT
        CASE
            WHEN element = 'Social-media ads' THEN 'Social media ads'
            WHEN element = 'Social-medial ads' THEN 'Social media ads'
            ELSE element
        END
    FROM unnest(content_types) AS element
    WHERE element != 'Other'
)
WHERE content_types @> '{Social-media ads}' 
   OR content_types @> '{Social-medial ads}'
   OR content_types @> '{Other}';


DO $$
BEGIN
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

DROP FUNCTION IF EXISTS public.upsert_creator_rates(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.upsert_creator_rates(UUID, JSONB);

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

ALTER TABLE public.creator_custom_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view their own custom rates" ON public.creator_custom_rates;
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

COMMIT;
