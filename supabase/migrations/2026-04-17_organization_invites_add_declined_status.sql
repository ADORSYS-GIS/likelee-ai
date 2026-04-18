ALTER TABLE public.organization_invites
DROP CONSTRAINT organization_invites_status_check;

ALTER TABLE public.organization_invites
ADD CONSTRAINT organization_invites_status_check
CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked'));
