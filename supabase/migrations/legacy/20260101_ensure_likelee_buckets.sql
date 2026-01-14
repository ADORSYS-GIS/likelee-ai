-- Ensure Likelee buckets exist and create minimal policies for public read and authenticated uploads
-- Idempotent and safe to rerun.

BEGIN;

-- Call existing helper to create buckets and public read policy
select public.ensure_storage('likelee-public', 'likelee-private', 'likelee-temp');

-- Allow authenticated users to INSERT (upload) into likelee-public bucket
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

COMMIT;
