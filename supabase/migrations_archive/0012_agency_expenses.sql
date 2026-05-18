BEGIN;

-- Agency Expenses (general operating expenses)
CREATE TABLE IF NOT EXISTS public.agency_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  name text NOT NULL,
  category text NOT NULL,
  expense_date date NOT NULL,

  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',

  status text NOT NULL DEFAULT 'approved',
  submitter text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_expenses_agency_id ON public.agency_expenses(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_expenses_expense_date ON public.agency_expenses(expense_date);

ALTER TABLE public.agency_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_expenses select own" ON public.agency_expenses;
CREATE POLICY "agency_expenses select own" ON public.agency_expenses
  FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "agency_expenses insert own" ON public.agency_expenses;
CREATE POLICY "agency_expenses insert own" ON public.agency_expenses
  FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "agency_expenses update own" ON public.agency_expenses;
CREATE POLICY "agency_expenses update own" ON public.agency_expenses
  FOR UPDATE USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "agency_expenses delete own" ON public.agency_expenses;
CREATE POLICY "agency_expenses delete own" ON public.agency_expenses
  FOR DELETE USING (agency_id = auth.uid());

COMMIT;
