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
  talent_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
  talent_name text,
  client_name text,
  type public.booking_type NOT NULL DEFAULT 'confirmed',
  status public.booking_status NOT NULL DEFAULT 'pending',
  date date NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  call_time text,
  wrap_time text,
  location text,
  location_notes text,
  rate_cents integer,
  currency text NOT NULL DEFAULT 'USD',
  rate_type public.booking_rate_type, -- controlled enum
  usage_terms text,
  usage_duration text,
  exclusive boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_agency_user_id ON public.bookings(agency_user_id);
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

COMMIT;
