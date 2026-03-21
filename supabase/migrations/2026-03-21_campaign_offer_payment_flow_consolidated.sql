-- 2026-03-21_campaign_offer_payment_flow_consolidated.sql
-- Consolidated migration for the campaign-offer payment + deliverables + payout/distribution work.
-- This squashes the following (previously separate) migrations from this PR into one:
-- - 2026-03-16_brand_campaigns_avg_turnaround.sql
-- - 2026-03-16_brand_campaigns_mark_done.sql
-- - 2026-03-17_brand_activity_events_extend.sql
-- - 2026-03-17_campaign_offer_billing_stubs.sql
-- - 2026-03-18_fix_v_face_payouts_union.sql
-- - 2026-03-19_campaign_offers_escrow_status_releasing.sql
-- - 2026-03-19_lockdown_likelee_private_storage_access.sql
-- - 2026-03-20_stop_decrementing_internal_balances_on_connected_account_payouts.sql
--
-- NOTE: We intentionally do NOT rewrite older historical migrations already present on `main`.

BEGIN;

-- ---------------------------------------------------------------------------
-- Campaign deliverables: support intermediate brand approval state
-- (We avoid editing older historical migrations; instead, we adjust the check constraint here.)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'campaign_offer_deliverables'
  ) THEN
    ALTER TABLE public.campaign_offer_deliverables
      DROP CONSTRAINT IF EXISTS campaign_offer_deliverables_status_check;

    -- Defensive cleanup: if any legacy rows have unexpected `status` values, normalize them
    -- before re-applying the stricter CHECK constraint. We default to `submitted` because it
    -- is the safest non-final state.
    UPDATE public.campaign_offer_deliverables
    SET status = 'submitted'
    WHERE status IS NULL
      OR status NOT IN (
        'submitted',
        'agency_review',
        'brand_review',
        'brand_approved',
        'changes_requested',
        'approved',
        'rejected'
      );

    ALTER TABLE public.campaign_offer_deliverables
      ADD CONSTRAINT campaign_offer_deliverables_status_check
      CHECK (
        status IN (
          'submitted',
          'agency_review',
          'brand_review',
          'brand_approved',
          'changes_requested',
          'approved',
          'rejected'
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Brand campaign completion + activity feed
-- ---------------------------------------------------------------------------
ALTER TABLE public.brand_campaigns
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.brand_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject_table text,
  subject_id uuid,
  title text,
  subtitle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_activity_events
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.brand_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_type text,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS idx_brand_activity_events_brand_created
  ON public.brand_activity_events (brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_activity_events_campaign_created
  ON public.brand_activity_events (campaign_id, created_at DESC);

ALTER TABLE public.brand_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can view own activity events"
  ON public.brand_activity_events FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can insert own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can insert own activity events"
  ON public.brand_activity_events FOR INSERT
  WITH CHECK (brand_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Brand turnaround metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brand_avg_turnaround_hours(
  p_brand_id uuid,
  p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
      )
    )::integer,
    0
  )
  FROM public.brand_campaigns
  WHERE brand_id = p_brand_id
    AND completed_at IS NOT NULL
    AND completed_at >= start_date::timestamptz
    AND start_date >= date_trunc('month', p_month)::date
    AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

CREATE OR REPLACE FUNCTION public.industry_avg_turnaround_hours(
  p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
      )
    )::integer,
    0
  )
  FROM public.brand_campaigns
  WHERE completed_at IS NOT NULL
    AND completed_at >= start_date::timestamptz
    AND start_date >= date_trunc('month', p_month)::date
    AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

-- ---------------------------------------------------------------------------
-- Campaign offer billing stubs + escrow release tracking + transfer records
-- ---------------------------------------------------------------------------
ALTER TABLE public.licensing_requests
  ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'licensing'
    CHECK (context_type IN ('licensing', 'campaign')),
  ADD COLUMN IF NOT EXISTS campaign_offer_id uuid REFERENCES public.campaign_offers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_licensing_requests_campaign_offer_id
  ON public.licensing_requests(campaign_offer_id);

CREATE INDEX IF NOT EXISTS idx_licensing_requests_context_type
  ON public.licensing_requests(context_type);

ALTER TABLE public.campaign_offers
  ADD COLUMN IF NOT EXISTS billing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'processing')),
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'holding',
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;

-- Ensure escrow status supports intermediate "releasing".
ALTER TABLE public.campaign_offers
  DROP CONSTRAINT IF EXISTS campaign_offers_escrow_status_check;

ALTER TABLE public.campaign_offers
  ADD CONSTRAINT campaign_offers_escrow_status_check
  CHECK (escrow_status IN ('holding', 'releasing', 'released'));

CREATE INDEX IF NOT EXISTS idx_campaign_offers_billing_request_id
  ON public.campaign_offers(billing_request_id);

CREATE INDEX IF NOT EXISTS idx_campaign_offers_escrow_status
  ON public.campaign_offers(escrow_status);

CREATE TABLE IF NOT EXISTS public.campaign_offer_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('agency', 'creator')),
  recipient_id uuid NOT NULL,
  stripe_connect_account_id text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'failed', 'reversed')),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cot_unique_recipient
  ON public.campaign_offer_transfers(offer_id, recipient_type, recipient_id);

CREATE INDEX IF NOT EXISTS idx_cot_offer_id
  ON public.campaign_offer_transfers(offer_id);

CREATE INDEX IF NOT EXISTS idx_cot_stripe_transfer_id
  ON public.campaign_offer_transfers(stripe_transfer_id);

ALTER TABLE public.campaign_offer_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view campaign offer transfers" ON public.campaign_offer_transfers;
CREATE POLICY "Agencies can view campaign offer transfers"
  ON public.campaign_offer_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_offers co
      WHERE co.id = offer_id
        AND co.target_type = 'agency'
        AND co.target_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can view campaign offer transfers" ON public.campaign_offer_transfers;
CREATE POLICY "Creators can view campaign offer transfers"
  ON public.campaign_offer_transfers FOR SELECT
  USING (
    recipient_type = 'creator'
    AND recipient_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.record_campaign_offer_transfer(
  p_offer_id uuid,
  p_recipient_type text,
  p_recipient_id uuid,
  p_stripe_connect_account_id text,
  p_amount_cents bigint,
  p_currency text,
  p_stripe_transfer_id text DEFAULT NULL,
  p_status text DEFAULT 'created',
  p_failure_reason text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.campaign_offer_transfers (
    offer_id,
    recipient_type,
    recipient_id,
    stripe_connect_account_id,
    amount_cents,
    currency,
    stripe_transfer_id,
    status,
    failure_reason,
    updated_at
  ) VALUES (
    p_offer_id,
    p_recipient_type,
    p_recipient_id,
    p_stripe_connect_account_id,
    p_amount_cents,
    COALESCE(NULLIF(p_currency, ''), 'USD'),
    p_stripe_transfer_id,
    COALESCE(NULLIF(p_status, ''), 'created'),
    p_failure_reason,
    now()
  )
  ON CONFLICT (offer_id, recipient_type, recipient_id)
  DO UPDATE SET
    stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
    amount_cents = EXCLUDED.amount_cents,
    currency = EXCLUDED.currency,
    stripe_transfer_id = COALESCE(EXCLUDED.stripe_transfer_id, public.campaign_offer_transfers.stripe_transfer_id),
    status = EXCLUDED.status,
    failure_reason = EXCLUDED.failure_reason,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.licensing_requests.context_type IS 'Distinguishes between traditional licensing deals and campaign offer billing stubs.';
COMMENT ON COLUMN public.campaign_offers.billing_request_id IS 'Reference to the licensing_request row acting as the financial stub for this offer.';

-- ---------------------------------------------------------------------------
-- Creator dashboard: ensure modern licensing_payouts are included in v_face_payouts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_face_payouts AS
-- 1. Legacy Royalty Ledger
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
GROUP BY rl.face_id, p.full_name, date_trunc('month', rl.period_month)

UNION ALL

-- 2. Modern Licensing Payouts (JSONB Splits)
SELECT
  (split->>'creator_id')::uuid AS face_id,
  c.full_name AS face_name,
  date_trunc('month', lp.paid_at)::date AS period_month,
  SUM((split->>'amount_cents')::bigint) AS paid_cents,
  0 AS pending_cents, -- These are always 'paid' once in this table
  SUM((split->>'amount_cents')::bigint) AS total_cents,
  COUNT(*) AS event_count
FROM public.licensing_payouts lp
CROSS JOIN LATERAL jsonb_array_elements(lp.talent_splits) AS split
JOIN public.creators c ON c.id = (split->>'creator_id')::uuid
WHERE (split->>'creator_id') IS NOT NULL AND (split->>'creator_id') <> ''
GROUP BY (split->>'creator_id')::uuid, c.full_name, date_trunc('month', lp.paid_at);

GRANT SELECT ON public.v_face_payouts TO anon;

-- ---------------------------------------------------------------------------
-- Hardening: prevent direct client reads from the private bucket.
-- Files in likelee-private must be accessed via backend proxy endpoints (service role).
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET public = false
WHERE id = 'likelee-private';

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        coalesce(qual, '') ILIKE '%likelee-private%'
        OR coalesce(with_check, '') ILIKE '%likelee-private%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Payout requests: connected-account payouts must NOT decrement internal balances.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_creator_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op for internal balances: creator payouts are executed on the connected account balance.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op for internal balances: agency payouts are executed on the connected account balance.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
