-- Migration: Ensure all agency and brand owners have organization_memberships records
-- This fixes the issue where owners/admins get "Access Denied" when accessing billing pages
--
-- Issue: The team RBAC system requires membership records for permission checking.
-- If these records don't exist, the /api/team/context endpoint fails and users
-- are denied access to pages requiring permissions (like manage_billing).
--
-- Solution: Create owner membership records for all agencies and brands where
-- the user_id matches the organization id (legacy owner pattern).

BEGIN;

-- ============================================================================
-- Ensure agency owner memberships exist
-- ============================================================================

-- Insert agency owner memberships for agencies where id = user_id
-- The agencies.id column references auth.users(id), so it IS the user_id
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
    COALESCE(a.created_at, now()),
    now(),
    now()
FROM public.agencies a
WHERE a.id IS NOT NULL
  AND COALESCE(a.email, '') <> ''
ON CONFLICT (organization_type, organization_id, user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now()
  WHERE organization_memberships.status != 'active' 
     OR organization_memberships.role != 'owner';

-- ============================================================================
-- Ensure brand owner memberships exist
-- ============================================================================

-- Insert brand owner memberships for brands where id = user_id
-- The brands.id column references auth.users(id), so it IS the user_id
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
    COALESCE(b.created_at, now()),
    now(),
    now()
FROM public.brands b
WHERE b.id IS NOT NULL
  AND COALESCE(b.email, '') <> ''
ON CONFLICT (organization_type, organization_id, user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now()
  WHERE organization_memberships.status != 'active' 
     OR organization_memberships.role != 'owner';

COMMIT;
