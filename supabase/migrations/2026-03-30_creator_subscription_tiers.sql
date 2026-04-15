BEGIN;

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_creators_plan_tier
  ON public.creators(plan_tier);

CREATE INDEX IF NOT EXISTS idx_creators_stripe_customer_id
  ON public.creators(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_creators_stripe_subscription_id
  ON public.creators(stripe_subscription_id);

CREATE TABLE IF NOT EXISTS public.creator_subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  stripe_customer_id text,
  stripe_subscription_id text,
  event_type text NOT NULL,
  plan_tier text NOT NULL DEFAULT 'free',
  subscription_status text NOT NULL DEFAULT 'inactive',
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_subscription_events_creator
  ON public.creator_subscription_events(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_subscription_events_subscription
  ON public.creator_subscription_events(stripe_subscription_id);

ALTER TABLE public.creator_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view their subscription events" ON public.creator_subscription_events;
CREATE POLICY "Creators can view their subscription events"
  ON public.creator_subscription_events
  FOR SELECT
  USING (auth.uid() = creator_id);

COMMIT;
