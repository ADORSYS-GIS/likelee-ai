BEGIN;

ALTER TABLE public.campaign_offers
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.campaign_offers
SET paid_at = COALESCE(created_at, now())
WHERE payment_status = 'paid'
  AND paid_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_offers_brand_paid_at
  ON public.campaign_offers(brand_id, paid_at DESC)
  WHERE payment_status = 'paid';

COMMIT;
