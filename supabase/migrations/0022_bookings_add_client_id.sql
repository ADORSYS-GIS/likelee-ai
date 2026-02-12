BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_client_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES public.agency_clients(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);

COMMIT;
