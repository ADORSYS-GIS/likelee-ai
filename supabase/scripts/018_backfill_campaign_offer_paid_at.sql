BEGIN;
UPDATE public.campaign_offers
SET paid_at = COALESCE(created_at, now())
WHERE payment_status = 'paid'
  AND paid_at IS NULL;
COMMIT;
