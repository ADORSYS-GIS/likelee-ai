-- 2026-03-19_lockdown_likelee_private_storage_access.sql
-- Hardening: prevent direct client reads from the private bucket.
-- Files in likelee-private must be accessed via backend proxy endpoints (service role).

BEGIN;

-- Ensure the bucket is private.
UPDATE storage.buckets
SET public = false
WHERE id = 'likelee-private';

-- Drop any SELECT policies that reference the likelee-private bucket.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        coalesce(qual, '') ILIKE '%likelee-private%'
        OR coalesce(with_check, '') ILIKE '%likelee-private%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

COMMIT;

