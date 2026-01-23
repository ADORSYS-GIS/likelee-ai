-- 0006_bookings.sql
BEGIN;

-- Enum types for booking fields
CREATE TYPE public.booking_type AS ENUM (
  'casting',
  'option',
  'confirmed',
  'test-shoot',
  'fitting',
  'rehearsal'
);

CREATE TYPE public.booking_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled'
);

-- Rate type enum
CREATE TYPE public.booking_rate_type AS ENUM (
  'day',
  'hourly',
  'flat',
  'tbd'
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_id uuid,
  talent_name text,
  client_id uuid REFERENCES public.agency_clients(id) ON DELETE SET NULL,
  client_name text,
  type public.booking_type NOT NULL DEFAULT 'confirmed',
  status public.booking_status NOT NULL DEFAULT 'pending',
  date date NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  call_time text,
  wrap_time text,
  location text,
  location_notes text,
  industries text[],
  rate_cents integer,
  currency text NOT NULL DEFAULT 'USD',
  rate_type public.booking_rate_type, -- controlled enum
  usage_terms text,
  usage_duration text,
  exclusive boolean NOT NULL DEFAULT false,
  notes text,
  -- Notification flags (stored with booking)
  notify_email boolean NOT NULL DEFAULT true,
  notify_sms boolean NOT NULL DEFAULT false,
  notify_push boolean NOT NULL DEFAULT false,
  notify_calendar boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_agency_user_id ON public.bookings(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings select own" ON public.bookings;
CREATE POLICY "bookings select own" ON public.bookings
  FOR SELECT USING (auth.uid() = agency_user_id);

DROP POLICY IF EXISTS "bookings insert own" ON public.bookings;
CREATE POLICY "bookings insert own" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = agency_user_id);

DROP POLICY IF EXISTS "bookings update own" ON public.bookings;
CREATE POLICY "bookings update own" ON public.bookings
  FOR UPDATE USING (auth.uid() = agency_user_id);

-- Booking files attached to a booking (private bucket paths)
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

-- Book-Outs (Talent Availability) merged into this migration for a single unit
-- Enum for book-out reason
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'book_out_reason' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.book_out_reason AS ENUM (
      'personal',
      'medical',
      'vacation',
      'other_booking',
      'other'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.book_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason public.book_out_reason NOT NULL DEFAULT 'personal',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_outs_agency_user_id ON public.book_outs(agency_user_id);
CREATE INDEX IF NOT EXISTS idx_book_outs_talent_id ON public.book_outs(talent_id);
CREATE INDEX IF NOT EXISTS idx_book_outs_date_range ON public.book_outs(start_date, end_date);

ALTER TABLE public.book_outs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "book_outs select own" ON public.book_outs;
CREATE POLICY "book_outs select own" ON public.book_outs
  FOR SELECT
  USING (agency_user_id = auth.uid());

DROP POLICY IF EXISTS "book_outs insert own" ON public.book_outs;
CREATE POLICY "book_outs insert own" ON public.book_outs
  FOR INSERT
  WITH CHECK (agency_user_id = auth.uid());

DROP POLICY IF EXISTS "book_outs update own" ON public.book_outs;
CREATE POLICY "book_outs update own" ON public.book_outs
  FOR UPDATE
  USING (agency_user_id = auth.uid());

DROP POLICY IF EXISTS "book_outs delete own" ON public.book_outs;
CREATE POLICY "book_outs delete own" ON public.book_outs
  FOR DELETE
  USING (agency_user_id = auth.uid());

COMMIT;
