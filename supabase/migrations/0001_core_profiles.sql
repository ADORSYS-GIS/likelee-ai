-- 0001_core_profiles.sql
-- Combined migration for profiles and royalty ledger

BEGIN;

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Creators table
CREATE TABLE IF NOT EXISTS public.creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  city text,
  state text,
  profile_photo_url text,
  profile_avatar_id uuid DEFAULT gen_random_uuid(),
  
  -- Physical attributes
  age integer,
  race text,
  hair_color text,
  hairstyle text,
  eye_color text,
  height_cm integer,
  weight_kg integer,
  facial_features text[],
  
  -- Metadata
  tagline text,
  
  -- Verification status
  kyc_status text DEFAULT 'not_started',
  liveness_status text DEFAULT 'not_started',
  kyc_provider text,
  kyc_session_id text,
  verified_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for creators
CREATE INDEX IF NOT EXISTS creators_age_idx ON public.creators(age);
CREATE INDEX IF NOT EXISTS creators_race_idx ON public.creators(race);
CREATE INDEX IF NOT EXISTS creators_hair_color_idx ON public.creators(hair_color);
CREATE INDEX IF NOT EXISTS creators_hairstyle_idx ON public.creators(hairstyle);
CREATE INDEX IF NOT EXISTS creators_eye_color_idx ON public.creators(eye_color);
CREATE INDEX IF NOT EXISTS creators_height_cm_idx ON public.creators(height_cm);
CREATE INDEX IF NOT EXISTS creators_weight_kg_idx ON public.creators(weight_kg);
CREATE INDEX IF NOT EXISTS creators_facial_features_gin ON public.creators USING GIN (facial_features);
CREATE INDEX IF NOT EXISTS idx_creators_profile_avatar_id ON public.creators (profile_avatar_id);

-- 2. Royalty Wallet ledger
CREATE TABLE IF NOT EXISTS public.royalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  face_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  booking_id text,
  brand_name text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency_code text NOT NULL DEFAULT 'USD' CHECK (currency_code = 'USD'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  period_month date NOT NULL, -- first day of month representing accrual period
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for royalty_ledger
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_face_id ON public.royalty_ledger (face_id);
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_period ON public.royalty_ledger (period_month);
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_status ON public.royalty_ledger (status);

-- RLS for royalty_ledger
ALTER TABLE public.royalty_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "royalty_ledger anon select" ON public.royalty_ledger;
CREATE POLICY "royalty_ledger anon select"
  ON public.royalty_ledger
  FOR SELECT
  TO anon
  USING (true);

-- 3. Aggregation view
CREATE OR REPLACE VIEW public.v_face_payouts AS
SELECT
  rl.face_id,
  p.full_name AS face_name,
  date_trunc('month', rl.period_month)::date AS period_month,
  SUM(CASE WHEN rl.status = 'paid' THEN rl.amount_cents ELSE 0 END) AS paid_cents,
  SUM(CASE WHEN rl.status = 'pending' THEN rl.amount_cents ELSE 0 END) AS pending_cents,
  SUM(rl.amount_cents) AS total_cents,
  COUNT(*) AS event_count
FROM public.royalty_ledger rl
JOIN public.creators p ON p.id = rl.face_id
GROUP BY rl.face_id, p.full_name, date_trunc('month', rl.period_month);

GRANT SELECT ON public.v_face_payouts TO anon;

-- 4. Create independent tables for brands and agencies

-- 4.1. Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name text NOT NULL,
    contact_name text,
    contact_title text,
    email text NOT NULL,
    website text,
    phone_number text,
    industry text,
    primary_goal jsonb,
    geographic_target text,
    provide_creators text,
    production_type text,
    budget_range text,
    creates_for text,
    uses_ai text,
    roles_needed jsonb,
    status text DEFAULT 'waitlist',
    onboarding_step text DEFAULT 'email_verification',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4.2. Create agencies table
CREATE TABLE IF NOT EXISTS public.agencies (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_name text NOT NULL,
    contact_name text,
    contact_title text,
    email text NOT NULL,
    website text,
    phone_number text,
    agency_type text, -- marketing_agency, talent_agency, sports_agency
    client_count text,
    campaign_budget text,
    services_offered jsonb,
    provide_creators text,
    handle_contracts text,
    talent_count text,
    licenses_likeness text,
    open_to_ai jsonb,
    campaign_types jsonb,
    bulk_onboard text,
    status text DEFAULT 'waitlist',
    onboarding_step text DEFAULT 'email_verification',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4.3. Indexes
CREATE INDEX IF NOT EXISTS idx_brands_email ON public.brands(email);
CREATE INDEX IF NOT EXISTS idx_agencies_email ON public.agencies(email);
CREATE INDEX IF NOT EXISTS idx_agencies_type ON public.agencies(agency_type);

-- 4.4. RLS for brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brand profile" ON public.brands;
CREATE POLICY "Users can view their own brand profile" ON public.brands
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own brand profile" ON public.brands;
CREATE POLICY "Users can update their own brand profile" ON public.brands
    FOR UPDATE USING (auth.uid() = id);

-- 4.5. RLS for agencies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own agency profile" ON public.agencies;
CREATE POLICY "Users can view their own agency profile" ON public.agencies
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own agency profile" ON public.agencies;
CREATE POLICY "Users can update their own agency profile" ON public.agencies
    FOR UPDATE USING (auth.uid() = id);



-- 4.6. Agency Users adjustments (merged from 0009)
-- If agency_users table exists, add a human-readable name and an index for lookups
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'agency_users'
  ) THEN
    -- Add name column if missing
    EXECUTE 'ALTER TABLE public.agency_users ADD COLUMN IF NOT EXISTS name text';

    -- Create composite index (agency_id, name) if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'idx_agency_users_agency_name' AND n.nspname = 'public'
    ) THEN
      EXECUTE 'CREATE INDEX idx_agency_users_agency_name ON public.agency_users(agency_id, name)';
    END IF;
  END IF;
END $$;

COMMIT;
