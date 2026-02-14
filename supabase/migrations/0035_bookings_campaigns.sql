-- 0035_bookings_campaigns.sql
BEGIN;

-- Create bookings_campaigns table
CREATE TABLE public.bookings_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL DEFAULT auth.uid(), -- The agency owning this campaign
  name text NOT NULL,
  status text NOT NULL DEFAULT 'created', -- 'created', 'ongoing', 'completed'
  duration_days integer,
  start_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add campaign_id to bookings table to allow grouping
ALTER TABLE public.bookings ADD COLUMN campaign_id uuid REFERENCES public.bookings_campaigns(id) ON DELETE SET NULL;

-- Indices for performance
CREATE INDEX idx_bookings_campaign_id ON public.bookings(campaign_id);
CREATE INDEX idx_bookings_campaigns_agency_id ON public.bookings_campaigns(agency_id);

-- RLS for bookings_campaigns
ALTER TABLE public.bookings_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_campaigns select own" ON public.bookings_campaigns
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "bookings_campaigns insert own" ON public.bookings_campaigns
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "bookings_campaigns update own" ON public.bookings_campaigns
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "bookings_campaigns delete own" ON public.bookings_campaigns
  FOR DELETE USING (agency_id = auth.uid());

COMMIT;
