BEGIN;
UPDATE public.creators 
SET trial_pro_started_at = trial_started_at 
WHERE trial_started_at IS NOT NULL AND plan_tier IN ('pro', 'enterprise');
COMMIT;
