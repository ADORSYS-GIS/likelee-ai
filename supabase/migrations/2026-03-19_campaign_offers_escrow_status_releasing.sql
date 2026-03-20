-- 2026-03-19_campaign_offers_escrow_status_releasing.sql
-- Allow intermediate escrow state while Stripe transfers are being created.

BEGIN;

-- Prior migration (2026-03-17_campaign_offer_billing_stubs.sql) created a CHECK constraint
-- that only allowed ('holding','released'). We need to support an intermediate 'releasing'
-- state so the backend can mark "in progress" escrow release safely/idempotently.
ALTER TABLE public.campaign_offers
  DROP CONSTRAINT IF EXISTS campaign_offers_escrow_status_check;

ALTER TABLE public.campaign_offers
  ADD CONSTRAINT campaign_offers_escrow_status_check
  CHECK (escrow_status IN ('holding', 'releasing', 'released'));

COMMIT;

