-- 017_core_auth.sql
-- Consolidated migration: extensions, royalty ledger, and Google signup restriction

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Royalty Wallet ledger
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

CREATE INDEX IF NOT EXISTS idx_royalty_ledger_face_id ON public.royalty_ledger (face_id);
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_period ON public.royalty_ledger (period_month);
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_status ON public.royalty_ledger (status);

ALTER TABLE public.royalty_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "royalty_ledger anon select" ON public.royalty_ledger;
CREATE POLICY "royalty_ledger anon select"
  ON public.royalty_ledger
  FOR SELECT
  TO anon
  USING (true);

-- Aggregation view
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

-- Block Google signups
CREATE OR REPLACE FUNCTION public.block_google_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the primary provider for this new user record is 'google'
  IF (new.raw_app_meta_data->>'provider') = 'google' THEN
    RAISE EXCEPTION 'Signups via Google are disabled. Please sign in with an existing account or use email to sign up.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_block_google') THEN
    CREATE TRIGGER on_auth_user_created_block_google
      BEFORE INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.block_google_signup();
  END IF;
END
$$;

COMMIT;
