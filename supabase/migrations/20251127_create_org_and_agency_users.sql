-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Organization profiles table
create table if not exists public.organization_profiles (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid not null,
  email text not null,
  organization_name text not null,
  contact_name text,
  contact_title text,
  organization_type text,
  website text,
  phone_number text,
  -- Step 2 fields
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
  status text default 'waitlist',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_profiles_owner_idx on public.organization_profiles(owner_user_id);

-- Basic RLS placeholders (adjust policies as needed)
alter table public.organization_profiles enable row level security;
-- Allow owner to manage their records (assumes auth.uid() is available via PostgREST/Supabase context)
drop policy if exists "owner can select" on public.organization_profiles;
create policy "owner can select" on public.organization_profiles for select using (owner_user_id = auth.uid());
drop policy if exists "owner can insert" on public.organization_profiles;
create policy "owner can insert" on public.organization_profiles for insert with check (owner_user_id = auth.uid());
drop policy if exists "owner can update" on public.organization_profiles;
create policy "owner can update" on public.organization_profiles for update using (owner_user_id = auth.uid());

-- Agency users table (membership & roles)
create table if not exists public.agency_users (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.organization_profiles(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner', -- owner | admin | manager | viewer
  status text not null default 'active', -- active | invited | suspended
  created_at timestamptz not null default now(),
  unique (agency_id, user_id)
);

create index if not exists agency_users_agency_idx on public.agency_users(agency_id);
create index if not exists agency_users_user_idx on public.agency_users(user_id);

alter table public.agency_users enable row level security;
drop policy if exists "members can select" on public.agency_users;
create policy "members can select" on public.agency_users for select using (
  user_id = auth.uid() or exists (
    select 1 from public.organization_profiles p where p.id = agency_id and p.owner_user_id = auth.uid()
  )
);
drop policy if exists "owners can insert" on public.agency_users;
create policy "owners can insert" on public.agency_users for insert with check (
  exists (
    select 1 from public.organization_profiles p where p.id = agency_id and p.owner_user_id = auth.uid()
  )
);
drop policy if exists "owners can update" on public.agency_users;
create policy "owners can update" on public.agency_users for update using (
  exists (
    select 1 from public.organization_profiles p where p.id = agency_id and p.owner_user_id = auth.uid()
  )
);
