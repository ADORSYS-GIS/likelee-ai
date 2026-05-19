-- 0009_agency_invoicing.sql
BEGIN;

-- 1) Invoice number counters (per agency)
CREATE TABLE IF NOT EXISTS public.agency_invoice_counters (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  counter integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Invoice number generator
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_agency_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n integer;
  yr text;
BEGIN
  INSERT INTO public.agency_invoice_counters (agency_id, counter)
  VALUES (p_agency_id, 1)
  ON CONFLICT (agency_id)
  DO UPDATE SET counter = public.agency_invoice_counters.counter + 1,
                updated_at = now()
  RETURNING counter INTO n;

  yr := to_char(now(), 'YYYY');
  RETURN 'INV-' || yr || '-' || lpad(n::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO anon, authenticated, service_role;

-- 3) Invoices
CREATE TABLE IF NOT EXISTS public.agency_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE RESTRICT,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,

  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','void')),

  invoice_date date NOT NULL,
  due_date date NOT NULL,
  sent_at timestamptz,
  paid_at timestamptz,

  bill_to_company text NOT NULL,
  bill_to_contact_name text,
  bill_to_email text,
  bill_to_phone text,

  po_number text,
  project_reference text,

  currency text NOT NULL DEFAULT 'USD',
  payment_terms text NOT NULL DEFAULT 'net_30',

  agency_commission_bps integer NOT NULL DEFAULT 2000,
  tax_rate_bps integer NOT NULL DEFAULT 0,
  tax_exempt boolean NOT NULL DEFAULT false,
  discount_cents integer NOT NULL DEFAULT 0,

  notes_internal text,
  payment_instructions text,
  footer_text text,

  subtotal_cents integer NOT NULL DEFAULT 0,
  expenses_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  agency_fee_cents integer NOT NULL DEFAULT 0,
  talent_net_cents integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (agency_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_agency_invoices_agency_id ON public.agency_invoices(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_client_id ON public.agency_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_status ON public.agency_invoices(status);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_invoice_date ON public.agency_invoices(invoice_date);

ALTER TABLE public.agency_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoices select own" ON public.agency_invoices;
CREATE POLICY "agency_invoices select own" ON public.agency_invoices
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoices insert own" ON public.agency_invoices;
CREATE POLICY "agency_invoices insert own" ON public.agency_invoices
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoices update own" ON public.agency_invoices;
CREATE POLICY "agency_invoices update own" ON public.agency_invoices
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoices delete own" ON public.agency_invoices;
CREATE POLICY "agency_invoices delete own" ON public.agency_invoices
  FOR DELETE USING (auth.uid() = agency_id);

-- 4) Invoice items
CREATE TABLE IF NOT EXISTS public.agency_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.agency_invoices(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,

  description text NOT NULL,
  talent_id uuid,
  talent_name text,
  date_of_service date,
  rate_type text,

  quantity numeric NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  line_total_cents integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_invoice_items_invoice_id ON public.agency_invoice_items(invoice_id);

ALTER TABLE public.agency_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_items select own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items select own" ON public.agency_invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_invoice_items insert own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items insert own" ON public.agency_invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_invoice_items update own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items update own" ON public.agency_invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_invoice_items delete own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items delete own" ON public.agency_invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

-- 5) Invoice expenses
CREATE TABLE IF NOT EXISTS public.agency_invoice_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.agency_invoices(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,

  description text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_invoice_expenses_invoice_id ON public.agency_invoice_expenses(invoice_id);

ALTER TABLE public.agency_invoice_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_expenses select own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses select own" ON public.agency_invoice_expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_invoice_expenses insert own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses insert own" ON public.agency_invoice_expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_invoice_expenses update own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses update own" ON public.agency_invoice_expenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_invoice_expenses delete own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses delete own" ON public.agency_invoice_expenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.agency_invoices i
      WHERE i.id = invoice_id AND i.agency_id = auth.uid()
    )
  );

COMMIT;
