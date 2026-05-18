BEGIN;

CREATE TABLE IF NOT EXISTS public.talent_tax_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('1099','w9')),
  tax_year integer,
  storage_bucket text,
  storage_path text,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_tax_documents_talent_created
  ON public.talent_tax_documents (talent_id, created_at DESC);

ALTER TABLE public.talent_tax_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "talent_tax_documents select" ON public.talent_tax_documents;
CREATE POLICY "talent_tax_documents select" ON public.talent_tax_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_users au
    WHERE au.id = talent_id
      AND (au.creator_id = auth.uid() OR au.user_id = auth.uid() OR au.agency_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "talent_tax_documents insert agency" ON public.talent_tax_documents;
CREATE POLICY "talent_tax_documents insert agency" ON public.talent_tax_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_users au
    WHERE au.id = talent_id
      AND au.agency_id = auth.uid()
  )
);

COMMIT;
