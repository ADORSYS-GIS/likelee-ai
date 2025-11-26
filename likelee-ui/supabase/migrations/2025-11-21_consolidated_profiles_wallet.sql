-- Consolidated migration: Profiles prerequisites + Royalty Wallet MVP (ledger, view, policies)
-- Goal: Couple related schema so environments can be provisioned consistently in one step.

BEGIN;

-- Ensure pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Minimal profiles table prerequisites used by wallet (id, full_name)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Ensure 'full_name' column exists for wallet face name join
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text;

-- (Optional) Helpful columns commonly present in profiles (kept idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

-- Royalty Wallet ledger
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_face_id ON public.royalty_ledger (face_id);
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_period ON public.royalty_ledger (period_month);
CREATE INDEX IF NOT EXISTS idx_royalty_ledger_status ON public.royalty_ledger (status);

-- RLS (MVP: permissive; tighten later)
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
JOIN public.profiles p ON p.id = rl.face_id
GROUP BY rl.face_id, p.full_name, date_trunc('month', rl.period_month);

GRANT SELECT ON public.v_face_payouts TO anon;

COMMIT;
