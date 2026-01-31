-- 0012_client_files_notes.sql
BEGIN;

-- 1. Add notes column to agency_clients
ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS notes text;

-- 2. Add client_id to agency_files to link files to specific clients
ALTER TABLE public.agency_files
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.agency_clients(id) ON DELETE CASCADE;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_agency_files_client_id ON public.agency_files(client_id);

-- 4. Update RLS for agency_files to handle client-specific access
-- Ensure agencies can only see files for their own clients
DROP POLICY IF EXISTS "agency_files select own" ON public.agency_files;
CREATE POLICY "agency_files select own" ON public.agency_files
  FOR SELECT USING (
    auth.uid() = agency_id OR 
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    )
  );

COMMIT;
