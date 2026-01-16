-- Combined payouts and escrow ledger migration (merged from 2026-01-08_* files)
-- Safe to run multiple times due to IF NOT EXISTS guards.

-- Extensions
create extension if not exists pgcrypto;

-- Creators payout integration columns
alter table if exists creators
  add column if not exists stripe_connect_account_id text,
  add column if not exists payouts_enabled boolean default false not null,
  add column if not exists last_payout_error text;

create index if not exists idx_creators_stripe_connect_account
  on creators (stripe_connect_account_id);

-- Payout requests
create table if not exists payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  fee_cents integer not null default 0,
  instant_fee_cents integer not null default 0,
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in (
    'pending','approved','processing','paid','failed','canceled'
  )),
  stripe_transfer_id text,
  stripe_payout_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz
);

create index if not exists idx_payout_requests_creator on payout_requests(creator_id);
create index if not exists idx_payout_requests_status on payout_requests(status);
create index if not exists idx_payout_requests_created_at on payout_requests(created_at);
create index if not exists idx_payout_requests_instant_fee on payout_requests(instant_fee_cents);

-- Webhook events (generic provider sink)
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_provider on webhook_events(provider);
create index if not exists idx_webhook_events_event_type on webhook_events(event_type);

-- Escrow ledger for creator balances
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  -- entry_type: 'credit' increases available, 'debit' decreases available
  entry_type text not null check (entry_type in ('credit','debit')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  -- optional correlation to business object (booking, refund, payout_request, etc.)
  reference_type text,
  reference_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ledger_entries_creator on ledger_entries(creator_id);
create index if not exists idx_ledger_entries_created_at on ledger_entries(created_at);

-- Balance view: available = credits - debits - payout holds (approved/processing)
create or replace view creator_balances as
with
  credits as (
    select creator_id, currency, sum(amount_cents) as credit_cents
    from ledger_entries
    where entry_type = 'credit'
    group by creator_id, currency
  ),
  debits as (
    select creator_id, currency, sum(amount_cents) as debit_cents
    from ledger_entries
    where entry_type = 'debit'
    group by creator_id, currency
  ),
  holds as (
    select pr.creator_id, pr.currency, coalesce(sum(pr.amount_cents),0) as hold_cents
    from payout_requests pr
    where pr.status in ('approved','processing')
    group by pr.creator_id, pr.currency
  )
select
  coalesce(c.creator_id, d.creator_id, h.creator_id) as creator_id,
  coalesce(c.currency, d.currency, h.currency) as currency,
  coalesce(c.credit_cents, 0) - coalesce(d.debit_cents, 0) - coalesce(h.hold_cents, 0) as available_cents,
  coalesce(c.credit_cents, 0) as total_credits_cents,
  coalesce(d.debit_cents, 0) as total_debits_cents,
  coalesce(h.hold_cents, 0) as reserved_cents
from credits c
full outer join debits d
  on c.creator_id = d.creator_id and c.currency = d.currency
full outer join holds h
  on coalesce(c.creator_id, d.creator_id) = h.creator_id
 and coalesce(c.currency, d.currency) = h.currency;
