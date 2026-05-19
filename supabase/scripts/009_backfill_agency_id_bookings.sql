BEGIN;
UPDATE public.bookings
SET agency_id = agency_user_id
WHERE agency_id IS NULL AND agency_user_id IN (SELECT id FROM public.agencies);
COMMIT;
