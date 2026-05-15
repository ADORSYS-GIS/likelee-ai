BEGIN;
INSERT INTO public.organization_memberships (
    organization_type, organization_id, user_id, role, is_active, joined_at, last_role_changed_at
)
SELECT 'agency', a.id, a.id, 'owner', true, COALESCE(a.created_at, now()), now()
FROM public.agencies a
WHERE a.id IS NOT NULL
ON CONFLICT (organization_type, organization_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, is_active = EXCLUDED.is_active, updated_at = now()
  WHERE organization_memberships.status != 'active' OR organization_memberships.role != 'owner';

INSERT INTO public.organization_memberships (
    organization_type, organization_id, user_id, role, is_active, joined_at, last_role_changed_at
)
SELECT 'brand', b.id, b.id, 'owner', true, COALESCE(b.created_at, now()), now()
FROM public.brands b
WHERE b.id IS NOT NULL
ON CONFLICT (organization_type, organization_id, user_id) DO UPDATE
  SET role = EXCLUDED.role, is_active = EXCLUDED.is_active, updated_at = now()
  WHERE organization_memberships.status != 'active' OR organization_memberships.role != 'owner';
COMMIT;
