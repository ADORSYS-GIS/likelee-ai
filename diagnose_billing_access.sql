-- Diagnostic script to check and fix billing access for agency owner
-- Agency ID: 6eeb46ec-738b-45fe-a56f-51cc84eed00f

-- ============================================
-- STEP 1: Find YOUR actual user ID
-- ============================================

-- First, find your user account. Replace with your email:
SELECT 
    u.id as your_user_id,
    u.email as your_email,
    u.raw_user_meta_data->>'role' as your_role,
    'Your actual user account' as note
FROM auth.users u
WHERE u.email = 'YOUR_EMAIL_HERE'  -- REPLACE THIS WITH YOUR EMAIL
LIMIT 1;

-- ============================================
-- STEP 2: Check current membership status
-- ============================================

-- Check all memberships for this agency
SELECT 
    om.organization_type,
    om.organization_id,
    om.user_id,
    om.email,
    om.role,
    om.status,
    om.created_at,
    om.updated_at,
    'Found membership' as note
FROM public.organization_memberships om
WHERE om.organization_id = '6eeb46ec-738b-45fe-a56f-51cc84eed00f'
ORDER BY om.role, om.created_at;

-- ============================================
-- STEP 3: Check agency details
-- ============================================

-- Check the agency record
SELECT 
    a.id as agency_id,
    a.email as agency_email,
    a.agency_name,
    a.stripe_customer_id,
    a.stripe_subscription_id,
    a.plan_tier,
    a.created_at,
    'Agency record' as note
FROM public.agencies a
WHERE a.id = '6eeb46ec-738b-45fe-a56f-51cc84eed00f';

-- ============================================
-- STEP 4: Apply the fix (TWO OPTIONS)
-- ============================================

-- OPTION A: If your user_id IS the same as agency_id (legacy pattern)
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
WHERE a.id = '6eeb46ec-738b-45fe-a56f-51cc84eed00f'
ON CONFLICT (organization_type, organization_id, user_id) 
DO UPDATE
  SET 
    email = COALESCE(NULLIF(EXCLUDED.email, ''), organization_memberships.email),
    role = 'owner',
    status = 'active',
    updated_at = now()
  WHERE organization_memberships.role != 'owner' 
     OR organization_memberships.status != 'active';

-- OPTION B: If your user_id is DIFFERENT from agency_id
-- First get your user_id from STEP 1, then uncomment and run:
/*
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
VALUES (
    'agency',
    '6eeb46ec-738b-45fe-a56f-51cc84eed00f',
    'YOUR_ACTUAL_USER_ID_FROM_STEP_1',  -- REPLACE THIS
    'YOUR_EMAIL_HERE',                    -- REPLACE THIS
    'owner',
    'active',
    now(),
    now(),
    now()
)
ON CONFLICT (organization_type, organization_id, user_id) 
DO UPDATE
  SET 
    role = 'owner',
    status = 'active',
    updated_at = now();
*/

-- ============================================
-- STEP 5: Verify the fix
-- ============================================

SELECT 
    om.organization_type,
    om.organization_id,
    om.user_id,
    om.email,
    om.role,
    om.status,
    om.created_at,
    om.updated_at,
    'After fix - you should see owner role' as note
FROM public.organization_memberships om
WHERE om.organization_id = '6eeb46ec-738b-45fe-a56f-51cc84eed00f'
ORDER BY om.role, om.created_at;

-- ============================================
-- STEP 6: What permissions you should have
-- ============================================

SELECT 
    'owner' as role,
    unnest(ARRAY[
        'create_campaigns',
        'approve_deliverables',
        'view_deliverables',
        'manage_billing',
        'invite_team_members',
        'update_member_roles',
        'view_team_members',
        'view_brand_connections',
        'manage_brand_connections',
        'view_licenses',
        'manage_licenses',
        'transfer_ownership',
        'delete_organisation'
    ]) as permission,
    'These are the permissions you should have' as note;
