-- 0003_assets_storage_moderation.sql
-- Combined migration for storage, moderation, and assets (images/voice)

BEGIN;

-- 1. Storage helper function
CREATE OR REPLACE FUNCTION public.ensure_storage(
  p_public_bucket text,
  p_private_bucket text,
  p_temp_bucket text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create buckets in an idempotent way
  INSERT INTO storage.buckets (id, name, public)
  SELECT p_public_bucket, p_public_bucket, true
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_public_bucket);

  INSERT INTO storage.buckets (id, name, public)
  SELECT p_private_bucket, p_private_bucket, false
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_private_bucket);

  INSERT INTO storage.buckets (id, name, public)
  SELECT p_temp_bucket, p_temp_bucket, false
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_temp_bucket);

  -- Idempotent public read policy for public bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public read '||p_public_bucket
  ) THEN
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L);', 'public read '||p_public_bucket, p_public_bucket);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_storage(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_storage(text, text, text) TO anon, authenticated, service_role;

-- Initialize buckets
SELECT public.ensure_storage('likelee-public', 'likelee-private', 'likelee-temp');

-- Allow authenticated users to upload to likelee-public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'authenticated insert likelee-public'
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L);',
      'authenticated insert likelee-public', 'likelee-public'
    );
  END IF;
END$$;

-- 2. Moderation events
CREATE TABLE IF NOT EXISTS public.moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  user_id text,
  image_role text,
  flagged boolean NOT NULL DEFAULT false,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_events_flagged ON public.moderation_events(flagged);
CREATE INDEX IF NOT EXISTS idx_moderation_events_review_status ON public.moderation_events(review_status);
CREATE INDEX IF NOT EXISTS idx_moderation_events_created_at ON public.moderation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_user_id ON public.moderation_events(user_id);

-- 3. Reference images
CREATE TABLE IF NOT EXISTS public.reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  section_id text NOT NULL, -- headshot_neutral, cameo_front, etc.
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  width integer,
  height integer,
  size_bytes bigint,
  mime_type text,
  sha256 text,
  moderation_status text NOT NULL DEFAULT 'approved',
  moderation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_images_user_section_path
  ON public.reference_images (user_id, section_id, storage_path);
CREATE INDEX IF NOT EXISTS idx_reference_images_user ON public.reference_images (user_id);
CREATE INDEX IF NOT EXISTS idx_reference_images_section ON public.reference_images (section_id);

ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner select') THEN
    CREATE POLICY "reference_images owner select" ON public.reference_images FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner insert') THEN
    CREATE POLICY "reference_images owner insert" ON public.reference_images FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner update') THEN
    CREATE POLICY "reference_images owner update" ON public.reference_images FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner delete') THEN
    CREATE POLICY "reference_images owner delete" ON public.reference_images FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

-- 4. Voice assets
CREATE TABLE IF NOT EXISTS public.voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  duration_sec integer,
  mime_type text,
  emotion_tag text,
  accessible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_recordings_user ON public.voice_recordings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_recordings_path ON public.voice_recordings(storage_bucket, storage_path);

ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner select') THEN
    CREATE POLICY "voice_recordings owner select" ON public.voice_recordings FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner insert') THEN
    CREATE POLICY "voice_recordings owner insert" ON public.voice_recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner update') THEN
    CREATE POLICY "voice_recordings owner update" ON public.voice_recordings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_recordings' AND policyname='voice_recordings owner delete') THEN
    CREATE POLICY "voice_recordings owner delete" ON public.voice_recordings FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.voice_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_voice_id text NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  source_recording_id uuid REFERENCES public.voice_recordings(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_models_user ON public.voice_models(user_id);

ALTER TABLE public.voice_models ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_models' AND policyname='voice_models owner select') THEN
    CREATE POLICY "voice_models owner select" ON public.voice_models FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_models' AND policyname='voice_models owner insert') THEN
    CREATE POLICY "voice_models owner insert" ON public.voice_models FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='voice_models' AND policyname='voice_models owner update') THEN
    CREATE POLICY "voice_models owner update" ON public.voice_models FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 5. Brand-side licensing and delivery
CREATE TABLE IF NOT EXISTS public.brand_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_org_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  face_user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  type text,
  status text NOT NULL DEFAULT 'active',
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_licenses_brand ON public.brand_licenses(brand_org_id);
CREATE INDEX IF NOT EXISTS idx_brand_licenses_face ON public.brand_licenses(face_user_id);

CREATE TABLE IF NOT EXISTS public.brand_voice_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_org_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  face_user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  license_id uuid NOT NULL REFERENCES public.brand_licenses(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_org_id, face_user_id, license_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_folders_brand ON public.brand_voice_folders(brand_org_id);

CREATE TABLE IF NOT EXISTS public.brand_voice_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.brand_voice_folders(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  recording_id uuid REFERENCES public.voice_recordings(id) ON DELETE SET NULL,
  model_id uuid REFERENCES public.voice_models(id) ON DELETE SET NULL,
  storage_bucket text,
  storage_path text,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_assets_folder ON public.brand_voice_assets(folder_id);

ALTER TABLE public.brand_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voice_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voice_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_voice_folders' AND policyname='brand members select folders') THEN
    CREATE POLICY "brand members select folders" ON public.brand_voice_folders FOR SELECT USING (
      auth.uid() = (SELECT user_id FROM public.brands WHERE id = brand_org_id)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_voice_assets' AND policyname='brand members select assets') THEN
    CREATE POLICY "brand members select assets" ON public.brand_voice_assets FOR SELECT USING (
      auth.uid() = (SELECT user_id FROM public.brands WHERE id = (SELECT brand_org_id FROM public.brand_voice_folders WHERE id = folder_id))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='brand_licenses' AND policyname='brand members select licenses') THEN
    CREATE POLICY "brand members select licenses" ON public.brand_licenses FOR SELECT USING (
      auth.uid() = (SELECT user_id FROM public.brands WHERE id = brand_org_id)
    );
  END IF;
END$$;

COMMIT;
