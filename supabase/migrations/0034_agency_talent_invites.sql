BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_talent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_name text,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_talent_invites_agency_id ON public.agency_talent_invites (agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_invites_email ON public.agency_talent_invites (email);
CREATE INDEX IF NOT EXISTS idx_agency_talent_invites_status ON public.agency_talent_invites (status);

ALTER TABLE public.agency_talent_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their sent talent invites" ON public.agency_talent_invites;
CREATE POLICY "Agencies can view their sent talent invites" ON public.agency_talent_invites
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create talent invites" ON public.agency_talent_invites;
CREATE POLICY "Agencies can create talent invites" ON public.agency_talent_invites
FOR INSERT
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage their talent invites" ON public.agency_talent_invites;
CREATE POLICY "Agencies can manage their talent invites" ON public.agency_talent_invites
FOR UPDATE
USING (agency_id = auth.uid())
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Talents can view their agency invites" ON public.agency_talent_invites;
CREATE POLICY "Talents can view their agency invites" ON public.agency_talent_invites
FOR SELECT
USING (lower(email) = lower((auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "Talents can respond to their agency invites" ON public.agency_talent_invites;
CREATE POLICY "Talents can respond to their agency invites" ON public.agency_talent_invites
FOR UPDATE
USING (lower(email) = lower((auth.jwt() ->> 'email')))
WITH CHECK (lower(email) = lower((auth.jwt() ->> 'email')));

COMMIT;
