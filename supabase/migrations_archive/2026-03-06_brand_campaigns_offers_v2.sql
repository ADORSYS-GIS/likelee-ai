BEGIN;

CREATE TABLE IF NOT EXISTS public.brand_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  usage_scope text,
  duration_days integer,
  territory text,
  exclusivity text,
  budget_range text NOT NULL,
  start_date date NOT NULL,
  custom_terms text,
  brief_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_campaigns_brand_created
  ON public.brand_campaigns (brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_campaigns_brand_status_start
  ON public.brand_campaigns (brand_id, status, start_date DESC);

ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can view own campaigns"
  ON public.brand_campaigns FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can create own campaigns"
  ON public.brand_campaigns FOR INSERT
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can update own campaigns"
  ON public.brand_campaigns FOR UPDATE
  USING (brand_id = auth.uid())
  WITH CHECK (brand_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.campaign_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('creator', 'agency')),
  target_id uuid NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'draft',
      'sent',
      'viewed',
      'accepted',
      'declined',
      'contract_pending',
      'contract_sent',
      'contract_partially_signed',
      'contract_fully_signed',
      'in_execution',
      'deliverables_submitted',
      'in_review',
      'changes_requested',
      'approved',
      'completed',
      'expired',
      'cancelled'
    )
  ),
  offer_title text,
  message text,
  expires_at timestamptz,
  decided_at timestamptz,
  brief_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offers_campaign_created
  ON public.campaign_offers (brand_campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_offers_brand_status_created
  ON public.campaign_offers (brand_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_offers_target_status
  ON public.campaign_offers (target_type, target_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_offers_active_target
  ON public.campaign_offers (brand_campaign_id, target_type, target_id)
  WHERE status NOT IN ('declined', 'cancelled', 'expired', 'completed');

ALTER TABLE public.campaign_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can view own campaign offers"
  ON public.campaign_offers FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can create own campaign offers"
  ON public.campaign_offers FOR INSERT
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can update own campaign offers"
  ON public.campaign_offers FOR UPDATE
  USING (brand_id = auth.uid())
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view agency-targeted offers" ON public.campaign_offers;
CREATE POLICY "Agencies can view agency-targeted offers"
  ON public.campaign_offers FOR SELECT
  USING (target_type = 'agency' AND target_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view creator-targeted offers" ON public.campaign_offers;
CREATE POLICY "Creators can view creator-targeted offers"
  ON public.campaign_offers FOR SELECT
  USING (target_type = 'creator' AND target_id = auth.uid());

COMMIT;
