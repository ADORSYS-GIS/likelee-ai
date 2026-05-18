BEGIN;

-- Per-agency storage settings (quota enforcement is implemented server-side)
CREATE TABLE IF NOT EXISTS public.agency_storage_settings (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  storage_limit_bytes bigint NOT NULL DEFAULT 10737418240,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_storage_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_storage_settings select own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings select own" ON public.agency_storage_settings
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_storage_settings insert own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings insert own" ON public.agency_storage_settings
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_storage_settings update own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings update own" ON public.agency_storage_settings
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_storage_settings delete own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings delete own" ON public.agency_storage_settings
  FOR DELETE USING (auth.uid() = agency_id);


-- Folder hierarchy for agency files
CREATE TABLE IF NOT EXISTS public.agency_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.agency_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_folders_agency_id ON public.agency_folders(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_folders_parent_id ON public.agency_folders(parent_id);

ALTER TABLE public.agency_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_folders select own" ON public.agency_folders;
CREATE POLICY "agency_folders select own" ON public.agency_folders
  FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_folders insert own" ON public.agency_folders;
CREATE POLICY "agency_folders insert own" ON public.agency_folders
  FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_folders update own" ON public.agency_folders;
CREATE POLICY "agency_folders update own" ON public.agency_folders
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_folders delete own" ON public.agency_folders;
CREATE POLICY "agency_folders delete own" ON public.agency_folders
  FOR DELETE USING (auth.uid() = agency_id);


-- Extend agency_files with folder + metadata needed for quota and UI
ALTER TABLE public.agency_files
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.agency_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS size_bytes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mime_type text;

CREATE INDEX IF NOT EXISTS idx_agency_files_folder_id ON public.agency_files(folder_id);

-- Add missing policies for update/delete (useful for self-service operations)
DROP POLICY IF EXISTS "agency_files update own" ON public.agency_files;
CREATE POLICY "agency_files update own" ON public.agency_files
  FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_files delete own" ON public.agency_files;
CREATE POLICY "agency_files delete own" ON public.agency_files
  FOR DELETE USING (auth.uid() = agency_id);

COMMIT;
