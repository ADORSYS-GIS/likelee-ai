-- Reset all existing creators to free plan
-- This ensures all existing creators must go through the subscription flow
-- Run this before deploying creator subscription features to production

BEGIN;

-- Reset all creators to free plan and clear any existing subscription data
UPDATE public.creators
SET
  plan_tier = 'free',
  plan_interval = 'month',
  trial_started_at = NULL,
  trial_basic_started_at = NULL,
  trial_pro_started_at = NULL,
  stripe_subscription_id = NULL,
  stripe_customer_id = NULL,
  stripe_current_period_end = NULL,
  stripe_cancel_at_period_end = false,
  plan_updated_at = NULL
WHERE 
  plan_tier != 'free'
  OR plan_tier IS NULL
  OR trial_started_at IS NOT NULL
  OR trial_basic_started_at IS NOT NULL
  OR trial_pro_started_at IS NOT NULL
  OR stripe_subscription_id IS NOT NULL
  OR stripe_customer_id IS NOT NULL;

-- Clear any existing creator subscription events
DELETE FROM public.creator_subscription_events;

COMMIT; 