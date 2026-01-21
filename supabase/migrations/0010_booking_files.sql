BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_files_booking_id ON public.booking_files(booking_id);

ALTER TABLE public.booking_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_files select own" ON public.booking_files;
CREATE POLICY "booking_files select own" ON public.booking_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "booking_files insert own" ON public.booking_files;
CREATE POLICY "booking_files insert own" ON public.booking_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
    )
  );

COMMIT;
