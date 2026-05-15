-- Migration: Campaign Offer Transfer Retry Support
-- Adds retry tracking columns to campaign_offer_transfers and a
-- helper view for the agency payout-status endpoint.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend campaign_offer_transfers with retry tracking
-- ---------------------------------------------------------------------------
ALTER TABLE public.campaign_offer_transfers
  ADD COLUMN IF NOT EXISTS retry_count   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retried_at    timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at   timestamptz;

-- Widen the status constraint to include pending_retry.
ALTER TABLE public.campaign_offer_transfers
  DROP CONSTRAINT IF EXISTS campaign_offer_transfers_status_check;

ALTER TABLE public.campaign_offer_transfers
  ADD CONSTRAINT campaign_offer_transfers_status_check
  CHECK (status IN ('created', 'failed', 'pending_retry', 'reversed'));

-- Index for fast "find all failed transfers for an offer" queries.
CREATE INDEX IF NOT EXISTS idx_cot_offer_status
  ON public.campaign_offer_transfers (offer_id, status);

-- ---------------------------------------------------------------------------
-- 2. RPC: mark a transfer as pending_retry (called before each retry attempt)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_transfer_pending_retry(
  p_offer_id        uuid,
  p_recipient_type  text,
  p_recipient_id    uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.campaign_offer_transfers
  SET
    status      = 'pending_retry',
    retried_at  = now(),
    retry_count = retry_count + 1,
    updated_at  = now()
  WHERE offer_id       = p_offer_id
    AND recipient_type = p_recipient_type
    AND recipient_id   = p_recipient_id
    AND status         = 'failed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 3. RPC: mark notified_at (so we don't spam recipients)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_transfer_notified(
  p_offer_id        uuid,
  p_recipient_type  text,
  p_recipient_id    uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.campaign_offer_transfers
  SET
    notified_at = now(),
    updated_at  = now()
  WHERE offer_id       = p_offer_id
    AND recipient_type = p_recipient_type
    AND recipient_id   = p_recipient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
