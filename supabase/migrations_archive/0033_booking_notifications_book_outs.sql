BEGIN;

ALTER TABLE public.booking_notifications
  ALTER COLUMN booking_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS book_out_id uuid REFERENCES public.book_outs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_booking_notifications_book_out
  ON public.booking_notifications(book_out_id);

COMMIT;
