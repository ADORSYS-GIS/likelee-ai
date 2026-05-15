BEGIN;

CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_type text NOT NULL CHECK (organization_type IN ('agency', 'brand')),
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'project_manager', 'reviewer')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    invited_by uuid,
    last_role_changed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_organization_memberships_org_user
    ON public.organization_memberships (organization_type, organization_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_organization_owner_membership
    ON public.organization_memberships (organization_type, organization_id)
    WHERE role = 'owner' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_organization_memberships_user
    ON public.organization_memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_organization_memberships_org
    ON public.organization_memberships (organization_type, organization_id, status);

CREATE TABLE IF NOT EXISTS public.organization_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_type text NOT NULL CHECK (organization_type IN ('agency', 'brand')),
    organization_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'project_manager', 'reviewer')),
    token_hash text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invited_by uuid NOT NULL,
    accepted_by uuid,
    accepted_at timestamptz,
    revoked_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_organization_invites_token_hash
    ON public.organization_invites (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_organization_invite
    ON public.organization_invites (organization_type, organization_id, email)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_organization_invites_org
    ON public.organization_invites (organization_type, organization_id, status);

CREATE INDEX IF NOT EXISTS idx_organization_invites_email
    ON public.organization_invites (email);

CREATE TABLE IF NOT EXISTS public.organization_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_type text NOT NULL CHECK (organization_type IN ('agency', 'brand')),
    organization_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    target_user_id uuid,
    target_email text,
    action text NOT NULL,
    old_role text,
    new_role text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_audit_logs_org
    ON public.organization_audit_logs (organization_type, organization_id, created_at DESC);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own organization memberships" ON public.organization_memberships;
CREATE POLICY "Users can view own organization memberships"
    ON public.organization_memberships
    FOR SELECT
    USING (auth.uid() = user_id);

INSERT INTO public.organization_memberships (
    organization_type,
    organization_id,
    user_id,
    email,
    role,
    status,
    created_at,
    updated_at,
    last_role_changed_at
)
SELECT
    'agency',
    a.id,
    a.id,
    LOWER(COALESCE(a.email, '')),
    'owner',
    'active',
    now(),
    now(),
    now()
FROM public.agencies a
WHERE a.id IS NOT NULL
  AND COALESCE(a.email, '') <> ''
ON CONFLICT (organization_type, organization_id, user_id) DO NOTHING;

INSERT INTO public.organization_memberships (
    organization_type,
    organization_id,
    user_id,
    email,
    role,
    status,
    created_at,
    updated_at,
    last_role_changed_at
)
SELECT
    'brand',
    b.id,
    b.id,
    LOWER(COALESCE(b.email, '')),
    'owner',
    'active',
    now(),
    now(),
    now()
FROM public.brands b
WHERE b.id IS NOT NULL
  AND COALESCE(b.email, '') <> ''
ON CONFLICT (organization_type, organization_id, user_id) DO NOTHING;

COMMIT;
