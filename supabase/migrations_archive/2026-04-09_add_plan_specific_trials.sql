-- Add plan-specific trial columns to public.creators table
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS trial_basic_started_at timestamptz;
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS trial_pro_started_at timestamptz;

-- Backfill: if trial_started_at is set, treat it as a trial for the current plan_tier
-- This is a best-effort backfill for existing trial users.
UPDATE public.creators 
SET trial_basic_started_at = trial_started_at 
WHERE trial_started_at IS NOT NULL AND plan_tier = 'basic';

UPDATE public.creators 
SET trial_pro_started_at = trial_started_at 
WHERE trial_started_at IS NOT NULL AND (plan_tier = 'pro' OR plan_tier = 'enterprise');
