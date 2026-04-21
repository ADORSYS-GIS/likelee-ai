BEGIN;

CREATE TABLE IF NOT EXISTS public.brand_storage_settings (
  brand_id uuid PRIMARY KEY REFERENCES public.brands(id) ON DELETE CASCADE,
  storage_limit_bytes bigint NOT NULL DEFAULT 5368709120,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_storage_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_storage_settings select own" ON public.brand_storage_settings;
CREATE POLICY "brand_storage_settings select own" ON public.brand_storage_settings
  FOR SELECT USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_storage_settings insert own" ON public.brand_storage_settings;
CREATE POLICY "brand_storage_settings insert own" ON public.brand_storage_settings
  FOR INSERT WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_storage_settings update own" ON public.brand_storage_settings;
CREATE POLICY "brand_storage_settings update own" ON public.brand_storage_settings
  FOR UPDATE USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_storage_settings delete own" ON public.brand_storage_settings;
CREATE POLICY "brand_storage_settings delete own" ON public.brand_storage_settings
  FOR DELETE USING (auth.uid() = brand_id);


CREATE TABLE IF NOT EXISTS public.brand_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.brand_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_folders_brand_id ON public.brand_folders(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_folders_parent_id ON public.brand_folders(parent_id);

ALTER TABLE public.brand_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_folders select own" ON public.brand_folders;
CREATE POLICY "brand_folders select own" ON public.brand_folders
  FOR SELECT USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_folders insert own" ON public.brand_folders;
CREATE POLICY "brand_folders insert own" ON public.brand_folders
  FOR INSERT WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_folders update own" ON public.brand_folders;
CREATE POLICY "brand_folders update own" ON public.brand_folders
  FOR UPDATE USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_folders delete own" ON public.brand_folders;
CREATE POLICY "brand_folders delete own" ON public.brand_folders
  FOR DELETE USING (auth.uid() = brand_id);


CREATE TABLE IF NOT EXISTS public.brand_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  folder_id uuid REFERENCES public.brand_folders(id) ON DELETE SET NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_files_brand_id ON public.brand_files(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_files_folder_id ON public.brand_files(folder_id);

ALTER TABLE public.brand_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_files select own" ON public.brand_files;
CREATE POLICY "brand_files select own" ON public.brand_files
  FOR SELECT USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_files insert own" ON public.brand_files;
CREATE POLICY "brand_files insert own" ON public.brand_files
  FOR INSERT WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_files update own" ON public.brand_files;
CREATE POLICY "brand_files update own" ON public.brand_files
  FOR UPDATE USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "brand_files delete own" ON public.brand_files;
CREATE POLICY "brand_files delete own" ON public.brand_files
  FOR DELETE USING (auth.uid() = brand_id);

COMMIT;
