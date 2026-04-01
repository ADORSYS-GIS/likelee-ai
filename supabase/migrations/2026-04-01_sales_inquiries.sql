create table if not exists public.sales_inquiries (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'website',
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  company_size text not null,
  message text,
  recipient_email text not null,
  email_transport text,
  email_delivery_status text not null default 'pending',
  email_delivery_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_inquiries_delivery_status_check
    check (email_delivery_status in ('pending', 'email_accepted', 'stored_only'))
);

create index if not exists sales_inquiries_created_at_idx
  on public.sales_inquiries (created_at desc);

create index if not exists sales_inquiries_delivery_status_idx
  on public.sales_inquiries (email_delivery_status);

alter table public.sales_inquiries enable row level security;
