-- Migration: Campaign Offer Billing Stubs
-- Description: Adds context_type and campaign_offer_id to licensing_requests to allow it to act as a billing stub for campaign offers.

-- 1. Update licensing_requests to support campaign context
ALTER TABLE public.licensing_requests 
ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'licensing' CHECK (context_type IN ('licensing', 'campaign')),
ADD COLUMN IF NOT EXISTS campaign_offer_id uuid REFERENCES public.campaign_offers(id) ON DELETE CASCADE;

-- Add index for fast lookups during webhooks and dashboard filtering
CREATE INDEX IF NOT EXISTS idx_licensing_requests_campaign_offer_id ON public.licensing_requests(campaign_offer_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_context_type ON public.licensing_requests(context_type);

-- 2. Link campaign_offers to their billing request (the shadow stub)
ALTER TABLE public.campaign_offers
ADD COLUMN IF NOT EXISTS billing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'processing'));

-- 2b. Escrow release tracking (agency campaign offers paid via checkout)
ALTER TABLE public.campaign_offers
ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'holding'
  CHECK (escrow_status IN ('holding', 'released')),
ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;

-- Add index for the back-link
CREATE INDEX IF NOT EXISTS idx_campaign_offers_billing_request_id ON public.campaign_offers(billing_request_id);

-- Add index for escrow release tracking
CREATE INDEX IF NOT EXISTS idx_campaign_offers_escrow_status
  ON public.campaign_offers(escrow_status);

-- 4. Record Stripe transfers for campaign offer escrow release
-- This parallels agency_payment_link_transfers but is keyed by offer_id (not payment_link_id).
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

-- 3. Update RLS policies to ensure brands/agencies can see their campaign billing stubs
-- Most policies on licensing_requests are already bound to agency_id/brand_id, so they should work out-of-the-box.
-- However, we ensure the context_type is considered in views if needed.

COMMENT ON COLUMN public.licensing_requests.context_type IS 'Distinguishes between traditional licensing deals and campaign offer billing stubs.';
COMMENT ON COLUMN public.campaign_offers.billing_request_id IS 'Reference to the licensing_request row acting as the financial stub for this offer.';
