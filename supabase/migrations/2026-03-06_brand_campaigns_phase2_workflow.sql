BEGIN;
alter table public.brands add column if not exists logo_url text;
CREATE TABLE IF NOT EXISTS public.campaign_offer_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
  brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('creator', 'agency')),
  target_id uuid NOT NULL,
  owner_role text NOT NULL CHECK (owner_role IN ('brand', 'agency')),
  title text,
  file_url text,
  docuseal_submission_id bigint,
  docuseal_template_id bigint,
  docuseal_slug text,
  docuseal_status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  last_synced_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offer_contracts_offer_created
  ON public.campaign_offer_contracts(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_contracts_brand_created
  ON public.campaign_offer_contracts(brand_id, created_at DESC);

ALTER TABLE public.campaign_offer_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can read own offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Brands can read own offer contracts"
  ON public.campaign_offer_contracts FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can manage own offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Brands can manage own offer contracts"
  ON public.campaign_offer_contracts FOR ALL
  USING (brand_id = auth.uid())
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can read targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Agencies can read targeted offer contracts"
  ON public.campaign_offer_contracts FOR SELECT
  USING (target_type = 'agency' AND target_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Agencies can manage targeted offer contracts"
  ON public.campaign_offer_contracts FOR ALL
  USING (target_type = 'agency' AND target_id = auth.uid())
  WITH CHECK (target_type = 'agency' AND target_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Creators can read targeted offer contracts"
  ON public.campaign_offer_contracts FOR SELECT
  USING (target_type = 'creator' AND target_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.campaign_offer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
  brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'feedback_received', 'expired', 'cancelled')),
  title text,
  message text,
  package_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  sent_at timestamptz,
  decided_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offer_packages_offer_created
  ON public.campaign_offer_packages(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_packages_brand_status
  ON public.campaign_offer_packages(brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_packages_agency_status
  ON public.campaign_offer_packages(agency_id, status, created_at DESC);

ALTER TABLE public.campaign_offer_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can read own packages" ON public.campaign_offer_packages;
CREATE POLICY "Brands can read own packages"
  ON public.campaign_offer_packages FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own packages" ON public.campaign_offer_packages;
CREATE POLICY "Brands can update own packages"
  ON public.campaign_offer_packages FOR UPDATE
  USING (brand_id = auth.uid())
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can read own packages" ON public.campaign_offer_packages;
CREATE POLICY "Agencies can read own packages"
  ON public.campaign_offer_packages FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own packages" ON public.campaign_offer_packages;
CREATE POLICY "Agencies can manage own packages"
  ON public.campaign_offer_packages FOR ALL
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.campaign_offer_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
  brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
  submitted_by uuid NOT NULL,
  asset_url text NOT NULL,
  asset_type text NOT NULL DEFAULT 'file',
  caption text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'agency_review', 'brand_review', 'changes_requested', 'approved', 'rejected')),
  agency_review_note text,
  brand_review_note text,
  reviewed_by_agency_at timestamptz,
  reviewed_by_brand_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_offer_created
  ON public.campaign_offer_deliverables(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_brand_status
  ON public.campaign_offer_deliverables(brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_agency_status
  ON public.campaign_offer_deliverables(agency_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_creator_status
  ON public.campaign_offer_deliverables(creator_id, status, created_at DESC);

ALTER TABLE public.campaign_offer_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Brands can read own deliverables"
  ON public.campaign_offer_deliverables FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Brands can update own deliverables"
  ON public.campaign_offer_deliverables FOR UPDATE
  USING (brand_id = auth.uid())
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Agencies can read own deliverables"
  ON public.campaign_offer_deliverables FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Agencies can manage own deliverables"
  ON public.campaign_offer_deliverables FOR ALL
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Creators can read own deliverables"
  ON public.campaign_offer_deliverables FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can create own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Creators can create own deliverables"
  ON public.campaign_offer_deliverables FOR INSERT
  WITH CHECK (creator_id = auth.uid());

COMMIT;
