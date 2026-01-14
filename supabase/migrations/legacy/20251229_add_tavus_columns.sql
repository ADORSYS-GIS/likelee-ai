-- Add Tavus replica tracking columns to profiles
alter table if exists public.profiles
  add column if not exists tavus_avatar_id text,
  add column if not exists tavus_avatar_status text,
  add column if not exists tavus_last_error text;

-- Ensure cameo_front_url exists (used to store training video URL)
-- If the column does not exist, create it; otherwise do nothing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'cameo_front_url'
  ) then
    alter table public.profiles add column cameo_front_url text;
  end if;
end $$;

-- Optional: indexes for faster lookups
create index if not exists idx_profiles_tavus_avatar_id on public.profiles (tavus_avatar_id);
create index if not exists idx_profiles_tavus_avatar_status on public.profiles (tavus_avatar_status);

-- Sanity check
-- select id, cameo_front_url, tavus_avatar_id, tavus_avatar_status, tavus_last_error
-- from public.profiles limit 5;
