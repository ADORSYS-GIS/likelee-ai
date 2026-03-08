-- 2026-03-08_booking_deliverables.sql
-- New deliverables table rooted in bookings_campaigns (Phase 1 / Agency-internal campaigns).
-- Creators upload media per booking campaign; agencies review.
BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_deliverables (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_campaign_id uuid NOT NULL REFERENCES public.bookings_campaigns(id) ON DELETE CASCADE,
  booking_id          uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  agency_id           uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id          uuid REFERENCES public.creators(id) ON DELETE SET NULL,
  asset_url           text NOT NULL,
  storage_path        text,
  storage_bucket      text,
  asset_type          text NOT NULL DEFAULT 'image',
  caption             text,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'approved', 'changes_requested', 'rejected')),
  agency_review_note  text,
  reviewed_by_agency_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_campaign
  ON public.booking_deliverables(booking_campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_agency
  ON public.booking_deliverables(agency_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_creator
  ON public.booking_deliverables(creator_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_deliverables_booking
  ON public.booking_deliverables(booking_id, created_at DESC);

-- RLS
ALTER TABLE public.booking_deliverables ENABLE ROW LEVEL SECURITY;

-- Agency: full access to deliverables under their campaigns
DROP POLICY IF EXISTS "Agency can manage own booking deliverables" ON public.booking_deliverables;
CREATE POLICY "Agency can manage own booking deliverables"
  ON public.booking_deliverables FOR ALL
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Creator: read own deliverables
DROP POLICY IF EXISTS "Creator can read own booking deliverables" ON public.booking_deliverables;
CREATE POLICY "Creator can read own booking deliverables"
  ON public.booking_deliverables FOR SELECT
  USING (creator_id = auth.uid());

-- Creator: insert own deliverables
DROP POLICY IF EXISTS "Creator can create own booking deliverables" ON public.booking_deliverables;
CREATE POLICY "Creator can create own booking deliverables"
  ON public.booking_deliverables FOR INSERT
  WITH CHECK (creator_id = auth.uid());

COMMIT;
