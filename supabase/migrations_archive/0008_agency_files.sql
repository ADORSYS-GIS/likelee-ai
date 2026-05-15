-- 0008_agency_files.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_files_agency_id ON public.agency_files(agency_id);

ALTER TABLE public.agency_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_files select own" ON public.agency_files;
CREATE POLICY "agency_files select own" ON public.agency_files
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_files insert own" ON public.agency_files;
CREATE POLICY "agency_files insert own" ON public.agency_files
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

COMMIT;
