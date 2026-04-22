BEGIN;

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS plan_interval text NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.creators.plan_interval IS 'The billing interval for the creator subscription (month or year)';
COMMENT ON COLUMN public.creators.stripe_current_period_end IS 'The end of the current billing period in Stripe';
COMMENT ON COLUMN public.creators.stripe_cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current period';

COMMIT;
