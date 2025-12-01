-- Reference images storage table and optional cameo backfill
-- Aligns with docs/design.md Storage Architecture (Supabase)

BEGIN;

-- Ensure pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.reference_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_id text NOT NULL, -- e.g., headshot_neutral, headshot_smiling, cameo_front, etc.
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text, -- present if stored under public bucket
  width integer,
  height integer,
  size_bytes bigint,
  mime_type text,
  sha256 text,
  moderation_status text NOT NULL DEFAULT 'approved', -- pending | approved | flagged
  moderation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Helpful composite uniqueness to avoid duplicate active entries per section (soft-enforced)
CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_images_user_section_path
  ON public.reference_images (user_id, section_id, storage_path);

CREATE INDEX IF NOT EXISTS idx_reference_images_user ON public.reference_images (user_id);
CREATE INDEX IF NOT EXISTS idx_reference_images_section ON public.reference_images (section_id);
CREATE INDEX IF NOT EXISTS idx_reference_images_created ON public.reference_images (created_at);

-- Enable RLS (owner-readable/writable). Server (service key) bypasses RLS as needed.
ALTER TABLE public.reference_images ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner select'
  ) THEN
    CREATE POLICY "reference_images owner select"
      ON public.reference_images
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner insert'
  ) THEN
    CREATE POLICY "reference_images owner insert"
      ON public.reference_images
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner update'
  ) THEN
    CREATE POLICY "reference_images owner update"
      ON public.reference_images
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reference_images' AND policyname = 'reference_images owner delete'
  ) THEN
    CREATE POLICY "reference_images owner delete"
      ON public.reference_images
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Optional: Backfill cameo_* columns (if present) into reference_images
DO $$
DECLARE
  col_front_exists boolean;
  col_left_exists boolean;
  col_right_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='cameo_front_url') INTO col_front_exists;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='cameo_left_url') INTO col_left_exists;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='cameo_right_url') INTO col_right_exists;

  IF col_front_exists THEN
    INSERT INTO public.reference_images (user_id, section_id, storage_bucket, storage_path, public_url, moderation_status)
    SELECT p.id, 'cameo_front', 'likelee-public', split_part(p.cameo_front_url, '/storage/v1/object/public/', 2), p.cameo_front_url, 'approved'
    FROM public.profiles p
    WHERE p.cameo_front_url IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF col_left_exists THEN
    INSERT INTO public.reference_images (user_id, section_id, storage_bucket, storage_path, public_url, moderation_status)
    SELECT p.id, 'cameo_left', 'likelee-public', split_part(p.cameo_left_url, '/storage/v1/object/public/', 2), p.cameo_left_url, 'approved'
    FROM public.profiles p
    WHERE p.cameo_left_url IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF col_right_exists THEN
    INSERT INTO public.reference_images (user_id, section_id, storage_bucket, storage_path, public_url, moderation_status)
    SELECT p.id, 'cameo_right', 'likelee-public', split_part(p.cameo_right_url, '/storage/v1/object/public/', 2), p.cameo_right_url, 'approved'
    FROM public.profiles p
    WHERE p.cameo_right_url IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END$$;

COMMIT;
