BEGIN;
INSERT INTO public.performance_tiers (agency_id, tier_name, min_monthly_earnings, min_monthly_bookings, payout_percent)
SELECT a.id, 'Premium', 10000, 10, 40.00
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.performance_tiers pt WHERE pt.agency_id = a.id AND pt.tier_name = 'Premium')
LIMIT 1;

INSERT INTO public.performance_tiers (agency_id, tier_name, min_monthly_earnings, min_monthly_bookings, payout_percent)
SELECT a.id, 'Core', 5000, 5, 35.00
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.performance_tiers pt WHERE pt.agency_id = a.id AND pt.tier_name = 'Core')
LIMIT 1;

INSERT INTO public.performance_tiers (agency_id, tier_name, min_monthly_earnings, min_monthly_bookings, payout_percent)
SELECT a.id, 'Growth', 1000, 2, 25.00
FROM public.agencies a
WHERE NOT EXISTS (SELECT 1 FROM public.performance_tiers pt WHERE pt.agency_id = a.id AND pt.tier_name = 'Growth')
LIMIT 1;
COMMIT;
