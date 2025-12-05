BEGIN;

-- Ensure pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.creator_custom_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rate_type text NOT NULL, -- 'content_type' or 'industry'
  rate_name text NOT NULL,
  price_per_week_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(creator_id, rate_type, rate_name)
);

-- 2. Enable RLS
ALTER TABLE public.creator_custom_rates ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'creator_custom_rates' AND policyname = 'Creators can view their own custom rates'
  ) THEN
    CREATE POLICY "Creators can view their own custom rates" 
    ON public.creator_custom_rates FOR SELECT 
    USING (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'creator_custom_rates' AND policyname = 'Creators can insert their own custom rates'
  ) THEN
    CREATE POLICY "Creators can insert their own custom rates" 
    ON public.creator_custom_rates FOR INSERT 
    WITH CHECK (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'creator_custom_rates' AND policyname = 'Creators can update their own custom rates'
  ) THEN
    CREATE POLICY "Creators can update their own custom rates" 
    ON public.creator_custom_rates FOR UPDATE 
    USING (auth.uid() = creator_id) 
    WITH CHECK (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'creator_custom_rates' AND policyname = 'Creators can delete their own custom rates'
  ) THEN
    CREATE POLICY "Creators can delete their own custom rates" 
    ON public.creator_custom_rates FOR DELETE 
    USING (auth.uid() = creator_id);
  END IF;
END$$;

-- 4. Create Upsert Function
CREATE OR REPLACE FUNCTION public.upsert_creator_rates(p_creator_id UUID, p_rates JSONB)
RETURNS void AS $$
BEGIN
    -- Security check: ensure user can only update their own rates
    IF auth.uid() != p_creator_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own rates';
    END IF;

    -- First, delete all existing rates for this user for the given types
    DELETE FROM public.creator_custom_rates
    WHERE creator_id = p_creator_id;

    -- Then, insert the new ones from the JSONB array
    INSERT INTO public.creator_custom_rates (creator_id, rate_type, rate_name, price_per_week_cents)
    SELECT
        p_creator_id,
        (rate->>'rate_type')::TEXT,
        (rate->>'rate_name')::TEXT,
        (rate->>'price_per_week_cents')::INT
    FROM jsonb_array_elements(p_rates) AS rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
