BEGIN;
UPDATE public.campaign_offers co
SET paid_at = repaired.corrected_paid_at
FROM (
  SELECT
    co.id,
    COALESCE(
      (
        SELECT MIN(p.paid_at)
        FROM public.payments p
        WHERE p.licensing_request_id = co.billing_request_id
          AND p.paid_at IS NOT NULL
      ),
      co.created_at
    ) AS corrected_paid_at
  FROM public.campaign_offers co
  WHERE co.payment_status = 'paid'
    AND co.paid_at IS NOT NULL
    AND co.updated_at IS NOT NULL
    AND co.created_at IS NOT NULL
    AND co.paid_at = co.updated_at
    AND co.created_at < co.paid_at
) AS repaired
WHERE co.id = repaired.id
  AND repaired.corrected_paid_at IS NOT NULL;
COMMIT;
