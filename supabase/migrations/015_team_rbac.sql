-- 015_team_rbac.sql
-- Consolidated migration for team RBAC (Role-Based Access Control)
-- Source files: 2026-04-04_team_rbac_foundation.sql, 2026-04-06_01_team_member_rls_policies.sql,
-- 2026-04-06_02_fix_team_member_deliverables_subscriptions_rls.sql,
-- 2026-04-08_01_fix_agency_clients_rls.sql, 2026-04-08_02_ensure_last_role_changed_at.sql,
-- 2026-04-15_team_member_rls_fixes.sql, 2026-04-17_organization_invites_add_declined_status.sql,
-- 2026-04-29_enforce_single_role.sql

BEGIN;

-- ============================================================================
-- 1. ORGANIZATION MEMBERSHIPS (Team Members)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization (polymorphic - can be agency or brand)
    organization_type text NOT NULL CHECK (organization_type IN ('agency', 'brand')),
    organization_id uuid NOT NULL,
    
    -- Member
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role
    role text NOT NULL DEFAULT 'reviewer' CHECK (role IN ('owner', 'admin', 'project_manager', 'reviewer')),
    
    -- Permissions (overrides for specific features)
    permissions jsonb DEFAULT '{}'::jsonb,
    
    -- Status
    is_active boolean DEFAULT true,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    email text,
    
    -- Timestamps
    invited_at timestamptz,
    joined_at timestamptz DEFAULT now(),
    last_role_changed_at timestamptz DEFAULT now(),
    deactivated_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (organization_type, organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_memberships_org ON public.organization_memberships(organization_type, organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_role ON public.organization_memberships(organization_type, organization_id, role);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_active ON public.organization_memberships(organization_type, organization_id, is_active);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_organization_memberships(
    p_organization_type TEXT,
    p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_memberships om
        WHERE om.organization_type = p_organization_type
            AND om.organization_id = p_organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om.is_active = true
            AND COALESCE(om.status, 'active') = 'active'
    );
$$;

DROP POLICY IF EXISTS "Members can view own memberships" ON public.organization_memberships;
CREATE POLICY "Members can view own memberships" ON public.organization_memberships
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can manage memberships" ON public.organization_memberships;
CREATE POLICY "Owners can manage memberships" ON public.organization_memberships
    FOR ALL USING (
        public.can_manage_organization_memberships(organization_type, organization_id)
    )
    WITH CHECK (
        public.can_manage_organization_memberships(organization_type, organization_id)
    );

-- ============================================================================
-- 2. ORGANIZATION INVITES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization
    organization_type text NOT NULL CHECK (organization_type IN ('agency', 'brand')),
    organization_id uuid NOT NULL,
    
    -- Invite Details
    email text NOT NULL,
    invited_by uuid NOT NULL REFERENCES auth.users(id),
    
    -- Role being invited
    role text NOT NULL DEFAULT 'reviewer' CHECK (role IN ('admin', 'project_manager', 'reviewer')),
    permissions jsonb DEFAULT '{}'::jsonb,
    
    -- Token
    token_hash text NOT NULL UNIQUE,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
    
    -- Expiration
    expires_at timestamptz NOT NULL,
    
    -- Response
    accepted_at timestamptz,
    declined_at timestamptz,
    declined_reason text,
    revoked_at timestamptz,
    revoked_by uuid REFERENCES auth.users(id),
    
    -- Result
    membership_id uuid REFERENCES public.organization_memberships(id) ON DELETE SET NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_invites_org ON public.organization_invites(organization_type, organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_email ON public.organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_organization_invites_token_hash ON public.organization_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_organization_invites_status ON public.organization_invites(status);
CREATE INDEX IF NOT EXISTS idx_organization_invites_expires ON public.organization_invites(expires_at);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. ORGANIZATION AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization
    organization_type text NOT NULL CHECK (organization_type IN ('agency', 'brand')),
    organization_id uuid NOT NULL,
    
    -- Action
    action text NOT NULL, -- 'member_invited', 'member_joined', 'role_changed', 'member_removed', etc.
    
    -- Actor
    actor_type text NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system')),
    actor_user_id text NOT NULL,
    
    -- Target (who was affected)
    target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    target_email text,
    
    -- Details
    old_role text,
    new_role text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_audit_logs_org ON public.organization_audit_logs(organization_type, organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_audit_logs_action ON public.organization_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_organization_audit_logs_actor ON public.organization_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_audit_logs_target ON public.organization_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_audit_logs_created ON public.organization_audit_logs(created_at DESC);

ALTER TABLE public.organization_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Check if user is agency team member
CREATE OR REPLACE FUNCTION public.is_agency_team_member(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE organization_type = 'agency'
            AND organization_id = p_agency_id
            AND user_id = auth.uid()
            AND is_active = true
    );
$$;

-- Check if user is brand team member
CREATE OR REPLACE FUNCTION public.is_brand_team_member(p_brand_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE organization_type = 'brand'
            AND organization_id = p_brand_id
            AND user_id = auth.uid()
            AND is_active = true
    );
$$;

-- Check if user has specific role in organization
CREATE OR REPLACE FUNCTION public.has_organization_role(
    p_organization_type TEXT,
    p_organization_id UUID,
    p_user_id UUID,
    p_min_role TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE organization_type = p_organization_type
            AND organization_id = p_organization_id
            AND user_id = p_user_id
            AND is_active = true
            AND (
                -- Role hierarchy: owner > admin > project_manager > reviewer
                (p_min_role = 'reviewer' AND role IN ('owner', 'admin', 'project_manager', 'reviewer')) OR
                (p_min_role = 'project_manager' AND role IN ('owner', 'admin', 'project_manager')) OR
                (p_min_role = 'admin' AND role IN ('owner', 'admin')) OR
                (p_min_role = 'owner' AND role = 'owner')
            )
    );
$$;

-- Check if user is organization owner
CREATE OR REPLACE FUNCTION public.is_organization_owner(
    p_organization_type TEXT,
    p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_memberships
        WHERE organization_type = p_organization_type
            AND organization_id = p_organization_id
            AND user_id = auth.uid()
            AND role = 'owner'
            AND is_active = true
    );
$$;

-- ============================================================================
-- 5. ENFORCE UNIQUE ORG MEMBERSHIP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public._enforce_unique_org_membership()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id) THEN
        IF EXISTS (
            SELECT 1 FROM public.organization_memberships
            WHERE organization_type = NEW.organization_type
                AND organization_id = NEW.organization_id
                AND user_id = NEW.user_id
                AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'User already has a membership in this organization';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
        NEW.last_role_changed_at := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_single_role ON public.organization_memberships;
CREATE TRIGGER trigger_enforce_single_role
    BEFORE INSERT OR UPDATE ON public.organization_memberships
    FOR EACH ROW EXECUTE FUNCTION public._enforce_unique_org_membership();

-- ============================================================================
-- 6. ENFORCE SINGLE ROLE (no profile mixing across creators/brands/agencies)
--    (from 2026-04-29)
-- ============================================================================
CREATE OR REPLACE FUNCTION public._count_user_roles(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.creators WHERE id = _user_id)::int +
    (SELECT COUNT(*) FROM public.brands  WHERE id = _user_id)::int +
    (SELECT COUNT(*) FROM public.agencies WHERE id = _user_id)::int;
$$;

CREATE OR REPLACE FUNCTION public._enforce_single_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_table text;
BEGIN
  v_table := TG_TABLE_NAME;

  IF TG_OP = 'UPDATE' THEN
    v_count := (
      (CASE WHEN v_table <> 'creators' THEN (SELECT COUNT(*) FROM public.creators WHERE id = NEW.id)::int ELSE 0 END) +
      (CASE WHEN v_table <> 'brands'    THEN (SELECT COUNT(*) FROM public.brands  WHERE id = NEW.id)::int  ELSE 0 END) +
      (CASE WHEN v_table <> 'agencies'  THEN (SELECT COUNT(*) FROM public.agencies WHERE id = NEW.id)::int ELSE 0 END)
    );

    IF v_count > 0 THEN
      RAISE EXCEPTION 'role_mixing_violation: user % already has a profile in another role table', NEW.id
        USING ERRCODE = '23P01',
              DETAIL  = format('A user may only have ONE role profile (creator, brand, or agency). User %s already has a profile in a different role table.', NEW.id);
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_count := public._count_user_roles(NEW.id);

    IF v_count > 0 THEN
      RAISE EXCEPTION 'role_mixing_violation: user % already has a profile in another role table', NEW.id
        USING ERRCODE = '23P01',
              DETAIL  = format('A user may only have ONE role profile (creator, brand, or agency). User %s already has a profile in a different role table.', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 7. TEAM MEMBER AWARE POLICIES (examples)
-- ============================================================================

-- These are policy templates that can be applied to various tables
-- to enable team member access

-- Example: Agency files - team member access
DROP POLICY IF EXISTS "Agency team can view files" ON public.agency_files;
CREATE POLICY "Agency team can view files" ON public.agency_files
    FOR SELECT USING (
        auth.uid() = agency_id
        OR public.is_agency_team_member(agency_id)
    );

-- Example: Brand campaigns - team member access
DROP POLICY IF EXISTS "Brand team can view campaigns" ON public.brand_campaigns;
CREATE POLICY "Brand team can view campaigns" ON public.brand_campaigns
    FOR SELECT USING (
        brand_id = auth.uid()
        OR public.is_brand_team_member(brand_id)
    );

-- Example: Brand campaigns - team member update
DROP POLICY IF EXISTS "Brand team can update campaigns" ON public.brand_campaigns;
CREATE POLICY "Brand team can update campaigns" ON public.brand_campaigns
    FOR UPDATE USING (
        brand_id = auth.uid()
        OR (
            public.is_brand_team_member(brand_id)
            AND public.has_organization_role('brand', brand_id, auth.uid(), 'project_manager')
        )
    );

-- Example: Agency clients - team member access (fix from 2026-04-08_01)
DROP POLICY IF EXISTS "Agency team can view clients" ON public.agency_clients;
CREATE POLICY "Agency team can view clients" ON public.agency_clients
    FOR SELECT USING (
        auth.uid() = agency_id
        OR public.is_agency_team_member(agency_id)
    );

DROP POLICY IF EXISTS "Users can view their own agency profile" ON public.agencies;
CREATE POLICY "Users can view their own agency profile" ON public.agencies
    FOR SELECT USING (
        auth.uid() = id
        OR public.is_agency_team_member(id)
    );

DROP POLICY IF EXISTS "Users can update their own agency profile" ON public.agencies;
CREATE POLICY "Users can update their own agency profile" ON public.agencies
    FOR UPDATE USING (
        auth.uid() = id
        OR (
            public.is_agency_team_member(id)
            AND public.has_organization_role('agency', id, auth.uid(), 'project_manager')
        )
    )
    WITH CHECK (
        auth.uid() = id
        OR (
            public.is_agency_team_member(id)
            AND public.has_organization_role('agency', id, auth.uid(), 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Agencies can view their own members" ON public.agency_users;
CREATE POLICY "Agencies can view their own members" ON public.agency_users
    FOR SELECT USING (
        agency_id = auth.uid()
        OR (
            public.is_agency_team_member(agency_id)
            AND public.has_organization_role('agency', agency_id, auth.uid(), 'reviewer')
        )
    );

DROP POLICY IF EXISTS "Agencies can manage their own members" ON public.agency_users;
CREATE POLICY "Agencies can manage their own members" ON public.agency_users
    FOR ALL USING (
        agency_id = auth.uid()
        OR (
            public.is_agency_team_member(agency_id)
            AND public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    )
    WITH CHECK (
        agency_id = auth.uid()
        OR (
            public.is_agency_team_member(agency_id)
            AND public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Agencies can view their agency talent connections" ON public.agency_talent_relationships;
CREATE POLICY "Agencies can view their agency talent connections" ON public.agency_talent_relationships
    FOR SELECT USING (
        agency_id = auth.uid()
        OR (
            public.is_agency_team_member(agency_id)
            AND public.has_organization_role('agency', agency_id, auth.uid(), 'reviewer')
        )
    );

DROP POLICY IF EXISTS "Agencies can create their agency talent connections" ON public.agency_talent_relationships;
CREATE POLICY "Agencies can create their agency talent connections" ON public.agency_talent_relationships
    FOR INSERT WITH CHECK (
        agency_id = auth.uid()
        OR (
            public.is_agency_team_member(agency_id)
            AND public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    );

DROP POLICY IF EXISTS "Agencies can update their agency talent connections" ON public.agency_talent_relationships;
CREATE POLICY "Agencies can update their agency talent connections" ON public.agency_talent_relationships
    FOR UPDATE USING (
        agency_id = auth.uid()
        OR (
            public.is_agency_team_member(agency_id)
            AND public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    )
    WITH CHECK (
        agency_id = auth.uid()
        OR (
            public.is_agency_team_member(agency_id)
            AND public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    );

-- Example: Campaign offer deliverables - team member subscriptions (fix from 2026-04-06_02)
DROP POLICY IF EXISTS "Brand team can view deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Brand team can view deliverables" ON public.campaign_offer_deliverables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.brand_campaigns c
            WHERE c.id = brand_campaign_id
                AND (
                    c.brand_id = auth.uid()
                    OR public.is_brand_team_member(c.brand_id)
                )
        )
    );

COMMIT;
