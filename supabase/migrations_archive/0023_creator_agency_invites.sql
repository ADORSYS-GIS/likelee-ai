BEGIN;

CREATE TABLE IF NOT EXISTS public.creator_agency_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_creator_id ON public.creator_agency_invites (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_agency_id ON public.creator_agency_invites (agency_id);
CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_status ON public.creator_agency_invites (status);

DROP INDEX IF EXISTS public.uniq_creator_agency_invites_pending;
CREATE UNIQUE INDEX uniq_creator_agency_invites_pending
ON public.creator_agency_invites (agency_id, creator_id)
WHERE status = 'pending';

ALTER TABLE public.creator_agency_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view their agency invites" ON public.creator_agency_invites;
CREATE POLICY "Creators can view their agency invites" ON public.creator_agency_invites
FOR SELECT
USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view their sent invites" ON public.creator_agency_invites;
CREATE POLICY "Agencies can view their sent invites" ON public.creator_agency_invites
FOR SELECT
USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create invites" ON public.creator_agency_invites;
CREATE POLICY "Agencies can create invites" ON public.creator_agency_invites
FOR INSERT
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can respond to their invites" ON public.creator_agency_invites;
CREATE POLICY "Creators can respond to their invites" ON public.creator_agency_invites
FOR UPDATE
USING (creator_id = auth.uid() AND status = 'pending')
WITH CHECK (creator_id = auth.uid() AND status IN ('accepted', 'declined'));

DROP POLICY IF EXISTS "Agencies can revoke their invites" ON public.creator_agency_invites;
CREATE POLICY "Agencies can revoke their invites" ON public.creator_agency_invites
FOR UPDATE
USING (agency_id = auth.uid() AND status = 'pending')
WITH CHECK (agency_id = auth.uid() AND status = 'revoked');

COMMIT;
