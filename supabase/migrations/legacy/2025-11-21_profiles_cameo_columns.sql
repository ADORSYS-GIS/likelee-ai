-- Add cameo image URL columns to profiles if they do not exist yet
alter table public.profiles
  add column if not exists cameo_front_url text,
  add column if not exists cameo_left_url  text,
  add column if not exists cameo_right_url text;
