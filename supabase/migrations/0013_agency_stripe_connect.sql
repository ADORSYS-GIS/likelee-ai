BEGIN;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_payout_error text;

CREATE INDEX IF NOT EXISTS idx_agencies_stripe_connect_account_id
  ON public.agencies(stripe_connect_account_id);

COMMIT;
