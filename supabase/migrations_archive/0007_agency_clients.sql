-- 0007_agency_clients.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  company text NOT NULL,
  contact_name text,
  email text,
  phone text,
  terms text,
  industry text,
  next_follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS industry text;

CREATE INDEX IF NOT EXISTS idx_agency_clients_agency_id ON public.agency_clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_clients_company ON public.agency_clients(company);

-- Row Level Security: restrict to owner of the organization
ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_clients select own" ON public.agency_clients;
CREATE POLICY "agency_clients select own" ON public.agency_clients
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_clients insert own" ON public.agency_clients;
CREATE POLICY "agency_clients insert own" ON public.agency_clients
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_clients update own" ON public.agency_clients;
CREATE POLICY "agency_clients update own" ON public.agency_clients
  FOR UPDATE USING (auth.uid() = agency_id);

COMMIT;
