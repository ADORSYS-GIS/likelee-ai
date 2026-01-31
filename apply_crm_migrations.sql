-- Apply CRM migrations manually
-- This script combines 0011_crm_expansion.sql and creates the missing migration 0012

BEGIN;

-- From 0011_crm_expansion.sql: Expand agency_clients table
ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Lead',
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS next_follow_up_date timestamptz,
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Create client_contacts table
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON public.client_contacts(client_id);

-- Create client_communications table
CREATE TABLE IF NOT EXISTS public.client_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'other')),
  subject text NOT NULL,
  content text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON public.client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_contact_id ON public.client_communications(contact_id);

-- Row Level Security for client_contacts
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_clients_contacts select own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts select own" ON public.client_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_clients_contacts insert own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts insert own" ON public.client_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_clients_contacts update own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts update own" ON public.client_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_clients_contacts delete own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts delete own" ON public.client_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    )
  );

-- Row Level Security for client_communications
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_clients_communications select own" ON public.client_communications;
CREATE POLICY "agency_clients_communications select own" ON public.client_communications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_clients_communications insert own" ON public.client_communications;
CREATE POLICY "agency_clients_communications insert own" ON public.client_communications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    )
  );

COMMIT;
