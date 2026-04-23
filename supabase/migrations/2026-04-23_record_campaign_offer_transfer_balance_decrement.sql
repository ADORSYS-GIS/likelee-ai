-- Migration: record_campaign_offer_transfer — decrement available_cents on successful transfer
--
-- Previously this RPC only wrote to campaign_offer_transfers.
-- It now also decrements the recipient's internal available_cents balance when
-- p_status = 'created' (i.e. Stripe transfer succeeded), keeping the internal
-- ledger in sync with actual Stripe account balances.
--
-- Idempotency guarantee: the balance decrement is guarded by a check that the
-- transfer row is transitioning TO 'created' for the first time. Replaying the
-- same successful transfer never double-decrements.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_campaign_offer_transfer(
  p_offer_id                  uuid,
  p_recipient_type            text,
  p_recipient_id              uuid,
  p_stripe_connect_account_id text,
  p_amount_cents              bigint,
  p_currency                  text,
  p_stripe_transfer_id        text    DEFAULT NULL,
  p_status                    text    DEFAULT 'created',
  p_failure_reason            text    DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_prev_status     text;
  v_resolved_status text;
BEGIN
  v_resolved_status := COALESCE(NULLIF(p_status, ''), 'created');

  -- Capture the previous status before upsert so we can decide whether to
  -- decrement the balance (only on the first successful transition).
  SELECT status INTO v_prev_status
  FROM public.campaign_offer_transfers
  WHERE offer_id       = p_offer_id
    AND recipient_type = p_recipient_type
    AND recipient_id   = p_recipient_id;

  -- Upsert the transfer record.
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
    v_resolved_status,
    p_failure_reason,
    now()
  )
  ON CONFLICT (offer_id, recipient_type, recipient_id)
  DO UPDATE SET
    stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
    amount_cents               = EXCLUDED.amount_cents,
    currency                   = EXCLUDED.currency,
    stripe_transfer_id         = COALESCE(
                                   EXCLUDED.stripe_transfer_id,
                                   public.campaign_offer_transfers.stripe_transfer_id
                                 ),
    status                     = EXCLUDED.status,
    failure_reason             = EXCLUDED.failure_reason,
    updated_at                 = now();

  -- Decrement available_cents only when the transfer transitions to 'created'
  -- for the first time. This prevents double-decrement on webhook replay or retry.
  IF v_resolved_status = 'created'
     AND p_stripe_transfer_id IS NOT NULL
     AND (v_prev_status IS NULL OR v_prev_status <> 'created')
  THEN
    IF p_recipient_type = 'agency' THEN
      UPDATE public.agency_balances
      SET available_cents = GREATEST(0, available_cents - p_amount_cents),
          updated_at      = now()
      WHERE agency_id = p_recipient_id;

    ELSIF p_recipient_type = 'creator' THEN
      UPDATE public.creator_balances
      SET available_cents = GREATEST(0, available_cents - p_amount_cents),
          updated_at      = now()
      WHERE creator_id = p_recipient_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
