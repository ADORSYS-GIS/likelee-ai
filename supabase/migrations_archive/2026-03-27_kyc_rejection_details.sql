BEGIN;

ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text,
  ADD COLUMN IF NOT EXISTS kyc_rejection_code text;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text,
  ADD COLUMN IF NOT EXISTS kyc_rejection_code text;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text,
  ADD COLUMN IF NOT EXISTS kyc_rejection_code text;

COMMIT;
