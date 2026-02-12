BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  title text,
  media_url text NOT NULL,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','hidden')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_agency_id
  ON public.talent_portfolio_items (agency_id);

CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_talent_id
  ON public.talent_portfolio_items (talent_id);

CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_created_at
  ON public.talent_portfolio_items (created_at DESC);

ALTER TABLE public.talent_portfolio_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view portfolio items" ON public.talent_portfolio_items;
CREATE POLICY "Agencies can view portfolio items" ON public.talent_portfolio_items
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage portfolio items" ON public.talent_portfolio_items;
CREATE POLICY "Agencies can manage portfolio items" ON public.talent_portfolio_items
FOR ALL
USING (agency_id = auth.uid())
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Talents can view their portfolio items" ON public.talent_portfolio_items;
CREATE POLICY "Talents can view their portfolio items" ON public.talent_portfolio_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Talents can manage their portfolio items" ON public.talent_portfolio_items;
CREATE POLICY "Talents can manage their portfolio items" ON public.talent_portfolio_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
);

COMMIT;
