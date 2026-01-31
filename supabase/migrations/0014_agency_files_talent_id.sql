-- 0014_agency_files_talent_id.sql
BEGIN;

-- Add talent_id to agency_files to link files to specific talents
ALTER TABLE public.agency_files
  ADD COLUMN IF NOT EXISTS talent_id uuid REFERENCES public.creators(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_agency_files_talent_id ON public.agency_files(talent_id);

-- Update RLS for agency_files to handle talent-specific access
DROP POLICY IF EXISTS "agency_files select own" ON public.agency_files;
CREATE POLICY "agency_files select own" ON public.agency_files
  FOR SELECT USING (
    auth.uid() = agency_id OR 
    EXISTS (
      SELECT 1 FROM public.agency_clients
      WHERE id = client_id AND agency_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.agency_users
      WHERE creator_id = talent_id AND agency_id = auth.uid()
    )
  );

COMMIT;
