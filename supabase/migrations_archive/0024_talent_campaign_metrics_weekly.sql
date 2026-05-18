BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_campaign_metrics_weekly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  views_week bigint NOT NULL DEFAULT 0 CHECK (views_week >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (talent_id, brand_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_talent_campaign_metrics_weekly_talent_id
  ON public.talent_campaign_metrics_weekly (talent_id);

CREATE INDEX IF NOT EXISTS idx_talent_campaign_metrics_weekly_brand_id
  ON public.talent_campaign_metrics_weekly (brand_id);

CREATE INDEX IF NOT EXISTS idx_talent_campaign_metrics_weekly_agency_id
  ON public.talent_campaign_metrics_weekly (agency_id);

CREATE INDEX IF NOT EXISTS idx_talent_campaign_metrics_weekly_week_start
  ON public.talent_campaign_metrics_weekly (week_start);

ALTER TABLE public.talent_campaign_metrics_weekly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view campaign metrics" ON public.talent_campaign_metrics_weekly;
CREATE POLICY "Agencies can view campaign metrics" ON public.talent_campaign_metrics_weekly
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage campaign metrics" ON public.talent_campaign_metrics_weekly;
CREATE POLICY "Agencies can manage campaign metrics" ON public.talent_campaign_metrics_weekly
FOR ALL
USING (agency_id = auth.uid())
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Talents can view their campaign metrics" ON public.talent_campaign_metrics_weekly;
CREATE POLICY "Talents can view their campaign metrics" ON public.talent_campaign_metrics_weekly
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
);

COMMIT;
