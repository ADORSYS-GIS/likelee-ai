BEGIN;

ALTER TABLE public.studio_wallets
ADD COLUMN IF NOT EXISTS current_plan text;

ALTER TABLE public.studio_wallets
DROP CONSTRAINT IF EXISTS studio_wallets_current_plan_check;

ALTER TABLE public.studio_wallets
ADD CONSTRAINT studio_wallets_current_plan_check
CHECK (current_plan IS NULL OR current_plan IN ('lite','pro'));

COMMIT;
