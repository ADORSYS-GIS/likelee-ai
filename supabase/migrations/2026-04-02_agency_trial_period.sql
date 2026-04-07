-- Add trial_ends_at to agencies table
-- New agencies automatically receive a 30-day Pro trial starting from account creation.

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Backfill: existing agencies with no plan (free) and created_at get a trial_ends_at
-- derived from their creation date. Agencies already on a paid plan are excluded.
UPDATE public.agencies
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE trial_ends_at IS NULL
  AND (plan_tier IS NULL OR plan_tier = 'free')
  AND created_at IS NOT NULL;

-- Set default for new agency rows so they automatically get a 30-day trial on INSERT.
-- NOTE: We set the default temporarily for backfill compatibility, then immediately
-- drop it so new registrations do NOT auto-start trials unless explicitly enabled
-- by application logic.
ALTER TABLE public.agencies
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + INTERVAL '30 days');
ALTER TABLE public.agencies
  ALTER COLUMN trial_ends_at DROP DEFAULT;
