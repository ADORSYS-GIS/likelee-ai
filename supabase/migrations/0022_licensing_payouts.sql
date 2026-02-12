BEGIN;

CREATE TABLE IF NOT EXISTS public.licensing_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licensing_request_id uuid NOT NULL REFERENCES public.licensing_requests(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  paid_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licensing_payouts_agency_id ON public.licensing_payouts (agency_id);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_talent_id ON public.licensing_payouts (talent_id);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_paid_at ON public.licensing_payouts (paid_at);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_request_id ON public.licensing_payouts (licensing_request_id);

ALTER TABLE public.licensing_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their licensing payouts" ON public.licensing_payouts;
CREATE POLICY "Agencies can view their licensing payouts" ON public.licensing_payouts
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage their licensing payouts" ON public.licensing_payouts;
CREATE POLICY "Agencies can manage their licensing payouts" ON public.licensing_payouts
FOR ALL
USING (agency_id = auth.uid())
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Talents can view their licensing payouts" ON public.licensing_payouts;
CREATE POLICY "Talents can view their licensing payouts" ON public.licensing_payouts
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
