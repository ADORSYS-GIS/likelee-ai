-- Pricing fields for profiles: USD-only, monthly base (>= $150), per-use ($5-$200)
begin;

-- Add columns if missing
alter table public.profiles
  add column if not exists base_monthly_price_cents integer,
  add column if not exists per_use_price_cents integer,
  add column if not exists currency_code text,
  add column if not exists pricing_updated_at timestamptz;

-- Defaults (do not force default for per_use to avoid masking user input)
alter table public.profiles
  alter column base_monthly_price_cents set default 15000,
  alter column currency_code set default 'USD',
  alter column pricing_updated_at set default now();

-- Backfill reasonable values where null
update public.profiles
  set base_monthly_price_cents = 15000
  where base_monthly_price_cents is null;

update public.profiles
  set currency_code = 'USD'
  where currency_code is null;

update public.profiles
  set per_use_price_cents = 500
  where per_use_price_cents is null;

-- Enforce constraints (drop if exist, then add)
alter table public.profiles
  drop constraint if exists profiles_base_monthly_price_min;
alter table public.profiles
  add constraint profiles_base_monthly_price_min
    check (base_monthly_price_cents >= 15000);

alter table public.profiles
  drop constraint if exists profiles_currency_usd_only;
alter table public.profiles
  add constraint profiles_currency_usd_only
    check (currency_code = 'USD');

alter table public.profiles
  drop constraint if exists profiles_per_use_price_range;
alter table public.profiles
  add constraint profiles_per_use_price_range
    check (per_use_price_cents >= 500 and per_use_price_cents <= 20000);

-- Enforce NOT NULL where applicable
alter table public.profiles
  alter column base_monthly_price_cents set not null,
  alter column per_use_price_cents set not null,
  alter column currency_code set not null;

-- Create indexes for discovery (idempotent)
create index if not exists idx_profiles_base_monthly_price on public.profiles(base_monthly_price_cents);
create index if not exists idx_profiles_per_use_price on public.profiles(per_use_price_cents);

commit;
