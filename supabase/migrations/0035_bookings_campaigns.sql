-- 0035_bookings_campaigns.sql
BEGIN;

-- Create bookings_campaigns table
-- Linked to a specific booking as requested (instead of agency_user_id)
CREATE TABLE IF NOT EXISTS public.bookings_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'created', -- 'created', 'ongoing', 'completed'
  duration_days integer,
  start_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add campaign_id to bookings table to allow grouping
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.bookings_campaigns(id) ON DELETE SET NULL;

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON public.bookings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bookings_campaigns_booking_id ON public.bookings_campaigns(booking_id);

-- RLS for bookings_campaigns
ALTER TABLE public.bookings_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_campaigns select own" ON public.bookings_campaigns;
CREATE POLICY "bookings_campaigns select own" ON public.bookings_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_campaigns insert own" ON public.bookings_campaigns;
CREATE POLICY "bookings_campaigns insert own" ON public.bookings_campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_campaigns update own" ON public.bookings_campaigns;
CREATE POLICY "bookings_campaigns update own" ON public.bookings_campaigns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_campaigns delete own" ON public.bookings_campaigns;
CREATE POLICY "bookings_campaigns delete own" ON public.bookings_campaigns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.agency_user_id = auth.uid()
    )
  );

COMMIT;
