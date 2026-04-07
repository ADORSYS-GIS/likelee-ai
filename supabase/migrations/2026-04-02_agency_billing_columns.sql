-- Add missing billing columns to agencies table for Stripe integration and trial status
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS plan_interval TEXT NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- Add index for plan_interval as it might be used in filtering
CREATE INDEX IF NOT EXISTS idx_agencies_plan_interval ON public.agencies(plan_interval);
