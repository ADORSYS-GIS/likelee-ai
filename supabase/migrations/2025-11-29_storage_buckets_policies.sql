-- Ensure buckets and storage policies via a SECURITY DEFINER function callable from backend
-- Backend will call: rpc ensure_storage(public_bucket, private_bucket, temp_bucket)

BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_storage(
  p_public_bucket text,
  p_private_bucket text,
  p_temp_bucket text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1) Create buckets in an idempotent way (INSERT ... WHERE NOT EXISTS)
  INSERT INTO storage.buckets (id, name, public)
  SELECT p_public_bucket, p_public_bucket, true
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_public_bucket);

  INSERT INTO storage.buckets (id, name, public)
  SELECT p_private_bucket, p_private_bucket, false
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_private_bucket);

  INSERT INTO storage.buckets (id, name, public)
  SELECT p_temp_bucket, p_temp_bucket, false
  WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_temp_bucket);

  -- 2) Idempotent public read policy for public bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public read '||p_public_bucket
  ) THEN
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L);', 'public read '||p_public_bucket, p_public_bucket);
  END IF;

  -- 3) Option B: server-only writes. We intentionally do NOT create client INSERT/UPDATE/DELETE policies.
  --    Private and temp remain without policies (no client access by default).

END;
$$;

REVOKE ALL ON FUNCTION public.ensure_storage(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_storage(text, text, text) TO anon, authenticated, service_role;

COMMIT;
