BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_irl_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void')),
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_irl_payments_agency_id
  ON public.talent_irl_payments (agency_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payments_talent_id
  ON public.talent_irl_payments (talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payments_paid_at
  ON public.talent_irl_payments (paid_at DESC);

ALTER TABLE public.talent_irl_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view IRL payments" ON public.talent_irl_payments;
CREATE POLICY "Agencies can view IRL payments" ON public.talent_irl_payments
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage IRL payments" ON public.talent_irl_payments;
CREATE POLICY "Agencies can manage IRL payments" ON public.talent_irl_payments
FOR ALL
USING (agency_id = auth.uid())
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Talents can view their IRL payments" ON public.talent_irl_payments;
CREATE POLICY "Talents can view their IRL payments" ON public.talent_irl_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Talents can manage their IRL payments" ON public.talent_irl_payments;
CREATE POLICY "Talents can manage their IRL payments" ON public.talent_irl_payments
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

CREATE TABLE IF NOT EXISTS public.talent_irl_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','failed','cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  external_ref text,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_talent_irl_payout_requests_agency_id
  ON public.talent_irl_payout_requests (agency_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payout_requests_talent_id
  ON public.talent_irl_payout_requests (talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payout_requests_requested_at
  ON public.talent_irl_payout_requests (requested_at DESC);

ALTER TABLE public.talent_irl_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view IRL payout requests" ON public.talent_irl_payout_requests;
CREATE POLICY "Agencies can view IRL payout requests" ON public.talent_irl_payout_requests
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage IRL payout requests" ON public.talent_irl_payout_requests;
CREATE POLICY "Agencies can manage IRL payout requests" ON public.talent_irl_payout_requests
FOR ALL
USING (agency_id = auth.uid())
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Talents can view their IRL payout requests" ON public.talent_irl_payout_requests;
CREATE POLICY "Talents can view their IRL payout requests" ON public.talent_irl_payout_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.creator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Talents can manage their IRL payout requests" ON public.talent_irl_payout_requests;
CREATE POLICY "Talents can manage their IRL payout requests" ON public.talent_irl_payout_requests
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
