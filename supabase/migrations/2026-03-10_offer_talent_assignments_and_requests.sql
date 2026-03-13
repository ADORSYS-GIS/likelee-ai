BEGIN;

-- Offer talent assignments
CREATE TABLE IF NOT EXISTS public.offer_talent_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'removed')),
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_talent_assignments_offer_talent
  ON public.offer_talent_assignments(offer_id, talent_id)
  WHERE status = 'assigned';

CREATE INDEX IF NOT EXISTS idx_offer_talent_assignments_offer
  ON public.offer_talent_assignments(offer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offer_talent_assignments_agency
  ON public.offer_talent_assignments(agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_offer_talent_assignments_creator
  ON public.offer_talent_assignments(creator_id, created_at DESC);

ALTER TABLE public.offer_talent_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can read offer talent assignments" ON public.offer_talent_assignments;
CREATE POLICY "Agencies can read offer talent assignments"
  ON public.offer_talent_assignments FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage offer talent assignments" ON public.offer_talent_assignments;
CREATE POLICY "Agencies can manage offer talent assignments"
  ON public.offer_talent_assignments FOR ALL
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read their offer talent assignments" ON public.offer_talent_assignments;
CREATE POLICY "Creators can read their offer talent assignments"
  ON public.offer_talent_assignments FOR SELECT
  USING (creator_id = auth.uid());

-- Offer asset requests
CREATE TABLE IF NOT EXISTS public.offer_asset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
  title text,
  message text,
  file_url text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'fulfilled', 'cancelled')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_offer_asset_requests_offer
  ON public.offer_asset_requests(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_asset_requests_agency
  ON public.offer_asset_requests(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_asset_requests_creator
  ON public.offer_asset_requests(creator_id, created_at DESC);

ALTER TABLE public.offer_asset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can read offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Agencies can read offer asset requests"
  ON public.offer_asset_requests FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Agencies can manage offer asset requests"
  ON public.offer_asset_requests FOR ALL
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Creators can read offer asset requests"
  ON public.offer_asset_requests FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Creators can update offer asset requests"
  ON public.offer_asset_requests FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Extend deliverables for source + assignment links
ALTER TABLE public.campaign_offer_deliverables
  ADD COLUMN IF NOT EXISTS submitted_by_role text NOT NULL DEFAULT 'creator',
  ADD COLUMN IF NOT EXISTS talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asset_request_id uuid REFERENCES public.offer_asset_requests(id) ON DELETE SET NULL;

ALTER TABLE public.campaign_offer_deliverables
  DROP CONSTRAINT IF EXISTS campaign_offer_deliverables_submitted_by_role_check;
ALTER TABLE public.campaign_offer_deliverables
  ADD CONSTRAINT campaign_offer_deliverables_submitted_by_role_check
    CHECK (submitted_by_role IN ('agency', 'creator'));

CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_talent
  ON public.campaign_offer_deliverables(talent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_request
  ON public.campaign_offer_deliverables(asset_request_id, created_at DESC);

COMMIT;
