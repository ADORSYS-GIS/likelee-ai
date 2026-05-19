BEGIN;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS agency_earnings_cents bigint NOT NULL DEFAULT 0 CHECK (agency_earnings_cents >= 0);

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS commission_rate numeric(10, 2);

-- Ensure Stripe webhook processing is idempotent for licensing request payouts.
-- We record the Stripe Checkout Session ID on each licensing_payouts row and prevent duplicates.

ALTER TABLE public.licensing_payouts
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

DROP INDEX IF EXISTS public.uq_licensing_payouts_stripe_session_talent;

CREATE UNIQUE INDEX IF NOT EXISTS uq_licensing_payouts_stripe_session_request
  ON public.licensing_payouts(stripe_checkout_session_id, licensing_request_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Remove legacy pay-split artifacts from campaigns.

DROP TRIGGER IF EXISTS campaigns_compute_earnings_trigger ON public.campaigns;
DROP FUNCTION IF EXISTS public.campaigns_compute_earnings();

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_agency_percent_check,
  DROP CONSTRAINT IF EXISTS campaigns_talent_percent_check,
  DROP CONSTRAINT IF EXISTS campaigns_split_sum_check;

ALTER TABLE public.campaigns
  DROP COLUMN IF EXISTS agency_percent,
  DROP COLUMN IF EXISTS talent_percent;

COMMIT;
