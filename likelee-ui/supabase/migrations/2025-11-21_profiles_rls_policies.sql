-- Enable RLS (safe if already enabled)
alter table public.profiles enable row level security;

-- Allow authenticated users to read their own profile
create policy if not exists "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Allow authenticated users to insert their own profile (id must match auth.uid())
create policy if not exists "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- Allow authenticated users to update their own profile
create policy if not exists "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
