BEGIN;
UPDATE public.agencies
SET plan_tier = 'none'
WHERE plan_tier = 'free';
COMMIT;
