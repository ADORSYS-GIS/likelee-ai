BEGIN;

-- Store raw webhook payloads for observability/debugging (used by likelee-server /webhooks/stripe)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_created_at
  ON public.webhook_events(provider, created_at DESC);


-- Agency plan state (authoritative; updated by Stripe subscription webhooks)
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz;


-- Update Free plan default storage limit to 5GB (existing migration default was 10GB)
ALTER TABLE public.agency_storage_settings
  ALTER COLUMN storage_limit_bytes SET DEFAULT 5368709120;

UPDATE public.agency_storage_settings
SET storage_limit_bytes = 5368709120,
    updated_at = now()
WHERE storage_limit_bytes = 10737418240;

CREATE INDEX IF NOT EXISTS idx_agencies_plan_tier ON public.agencies(plan_tier);
CREATE INDEX IF NOT EXISTS idx_agencies_stripe_customer_id ON public.agencies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_agencies_stripe_subscription_id ON public.agencies(stripe_subscription_id);


-- Subscription audit trail (optional but useful for support and debugging)
CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text NOT NULL,
  stripe_price_id text,
  status text NOT NULL,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_agency_id
  ON public.agency_subscriptions(agency_id);


-- Allow agencies to read their own plan status
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_subscriptions select own" ON public.agency_subscriptions;
CREATE POLICY "agency_subscriptions select own" ON public.agency_subscriptions
  FOR SELECT USING (auth.uid() = agency_id);

COMMIT;
