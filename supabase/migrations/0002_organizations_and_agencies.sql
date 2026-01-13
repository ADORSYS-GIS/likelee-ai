-- 0002_organizations_and_agencies.sql
-- Combined migration for organization profiles and agency users

BEGIN;

-- 1. Organization profiles table
CREATE TABLE IF NOT EXISTS public.organization_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id uuid NOT NULL,
  email text NOT NULL,
  organization_name text NOT NULL,
  contact_name text,
  contact_title text,
  organization_type text,
  website text,
  phone_number text,
  
  -- Business details
  industry text,
  primary_goal text,
  geographic_target text,
  production_type text,
  budget_range text,
  uses_ai text,
  creates_for text,
  roles_needed jsonb,
  client_count text,
  campaign_budget text,
  services_offered jsonb,
  handle_contracts text,
  talent_count text,
  licenses_likeness text,
  open_to_ai jsonb,
  campaign_types jsonb,
  bulk_onboard text,
  
  status text DEFAULT 'waitlist',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_profiles_owner_idx ON public.organization_profiles(owner_user_id);

-- RLS for organization_profiles
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner can select" ON public.organization_profiles;
CREATE POLICY "owner can select" ON public.organization_profiles FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "owner can insert" ON public.organization_profiles;
CREATE POLICY "owner can insert" ON public.organization_profiles FOR INSERT WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "owner can update" ON public.organization_profiles;
CREATE POLICY "owner can update" ON public.organization_profiles FOR UPDATE USING (owner_user_id = auth.uid());

-- 2. Agency users table (membership & roles)
CREATE TABLE IF NOT EXISTS public.agency_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id uuid NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner', -- owner | admin | manager | viewer
  status text NOT NULL DEFAULT 'active', -- active | invited | suspended
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS agency_users_agency_idx ON public.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS agency_users_user_idx ON public.agency_users(user_id);

-- RLS for agency_users
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can select" ON public.agency_users;
CREATE POLICY "members can select" ON public.agency_users FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.organization_profiles p WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owners can insert" ON public.agency_users;
CREATE POLICY "owners can insert" ON public.agency_users FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_profiles p WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "owners can update" ON public.agency_users;
CREATE POLICY "owners can update" ON public.agency_users FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.organization_profiles p WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
  )
);

COMMIT;
