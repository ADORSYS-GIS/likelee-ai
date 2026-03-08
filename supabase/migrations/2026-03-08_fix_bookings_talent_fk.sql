BEGIN;

-- Ensure talent_id correctly references agency_users for nested joins in Postgrest
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_talent_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_talent_id_fkey
FOREIGN KEY (talent_id) REFERENCES public.agency_users(id) ON DELETE SET NULL;

COMMIT;
