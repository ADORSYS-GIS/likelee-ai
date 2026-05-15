ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS studio_addon_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS studio_addon_subscription_id text,
  ADD COLUMN IF NOT EXISTS studio_addon_status text,
  ADD COLUMN IF NOT EXISTS studio_addon_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS studio_addon_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS studio_addon_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_brands_plan_tier
  ON public.brands(plan_tier);

CREATE INDEX IF NOT EXISTS idx_brands_stripe_subscription_id
  ON public.brands(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brands_studio_addon_active
  ON public.brands(studio_addon_active);

CREATE INDEX IF NOT EXISTS idx_brands_studio_addon_subscription_id
  ON public.brands(studio_addon_subscription_id)
  WHERE studio_addon_subscription_id IS NOT NULL;
