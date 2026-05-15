BEGIN;
UPDATE public.creators
SET licensing_rate_weekly_cents = ROUND(licensing_rate_monthly_cents::numeric / 4.345)::bigint
WHERE licensing_rate_weekly_cents IS NULL
  AND licensing_rate_monthly_cents IS NOT NULL
  AND licensing_rate_monthly_cents > 0;

UPDATE public.agency_users
SET licensing_rate_weekly_cents = ROUND(licensing_rate_cents::numeric / 4.345)::bigint
WHERE licensing_rate_weekly_cents IS NULL
  AND licensing_rate_cents IS NOT NULL
  AND licensing_rate_cents > 0;
COMMIT;
