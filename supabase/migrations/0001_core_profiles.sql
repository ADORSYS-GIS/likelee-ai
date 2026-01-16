-- 0001_core_profiles.sql
-- Combined migration for profiles and royalty ledger

BEGIN;

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
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
  
  -- Role and metadata
  role text DEFAULT 'creator',
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

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS profiles_age_idx ON public.profiles(age);
CREATE INDEX IF NOT EXISTS profiles_race_idx ON public.profiles(race);
CREATE INDEX IF NOT EXISTS profiles_hair_color_idx ON public.profiles(hair_color);
CREATE INDEX IF NOT EXISTS profiles_hairstyle_idx ON public.profiles(hairstyle);
CREATE INDEX IF NOT EXISTS profiles_eye_color_idx ON public.profiles(eye_color);
CREATE INDEX IF NOT EXISTS profiles_height_cm_idx ON public.profiles(height_cm);
CREATE INDEX IF NOT EXISTS profiles_weight_kg_idx ON public.profiles(weight_kg);
CREATE INDEX IF NOT EXISTS profiles_facial_features_gin ON public.profiles USING GIN (facial_features);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_avatar_id ON public.profiles (profile_avatar_id);

-- 2. Royalty Wallet ledger
CREATE TABLE IF NOT EXISTS public.royalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  face_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
JOIN public.profiles p ON p.id = rl.face_id
GROUP BY rl.face_id, p.full_name, date_trunc('month', rl.period_month);

GRANT SELECT ON public.v_face_payouts TO anon;

COMMIT;
