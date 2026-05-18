BEGIN;
UPDATE public.creators
SET
  plan_tier = 'free',
  plan_interval = 'month',
  trial_started_at = NULL,
  trial_pro_started_at = NULL,
  stripe_subscription_id = NULL,
  stripe_customer_id = NULL,
  subscription_current_period_end = NULL
WHERE 
  plan_tier != 'free'
  OR plan_tier IS NULL
  OR trial_started_at IS NOT NULL
  OR trial_pro_started_at IS NOT NULL
  OR stripe_subscription_id IS NOT NULL
  OR stripe_customer_id IS NOT NULL;

DELETE FROM public.creator_subscription_events;
COMMIT;
