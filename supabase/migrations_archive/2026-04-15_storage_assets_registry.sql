1BEGIN;

CREATE TABLE IF NOT EXISTS public.storage_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('agency', 'creator', 'brand', 'user', 'system')),
  owner_id uuid NOT NULL,
  context_type text NOT NULL CHECK (
    context_type IN (
      'agency_storage',
      'client_file',
      'talent_asset',
      'talent_portfolio',
      'booking_file',
      'booking_deliverable',
      'campaign_offer_deliverable',
      'reference_image',
      'voice_recording',
      'tax_document',
      'brand_voice_asset',
      'studio_document'
    )
  ),
  context_id uuid,
  visibility text NOT NULL CHECK (visibility IN ('public', 'private', 'temp')),
  bucket_id text NOT NULL,
  object_path text NOT NULL,
  original_file_name text,
  mime_type text,
  size_bytes bigint,
  checksum_sha256 text,
  source_table text,
  source_id uuid,
  created_by uuid,
  counts_toward_quota boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_assets_bucket_path
  ON public.storage_assets(bucket_id, object_path);

CREATE UNIQUE INDEX IF NOT EXISTS uq_storage_assets_source
  ON public.storage_assets(source_table, source_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_storage_assets_owner
  ON public.storage_assets(owner_type, owner_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_storage_assets_context
  ON public.storage_assets(context_type, context_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_storage_assets_quota
  ON public.storage_assets(owner_type, owner_id, counts_toward_quota, deleted_at);

ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;

-- Note: storage_assets is a service-only table.
-- It should NOT be accessed directly by clients.
-- All queries should go through backend API endpoints that use service_role.
-- 
-- Rationale:
-- 1. owner_id for agency-owned assets is an agency ID, not a user ID
-- 2. Proper access requires checking membership tables (agency_users, etc.)
-- 3. Exposing metadata could leak information about assets a user shouldn't see
--
-- To enable client access, implement proper RLS policies that join with
-- membership tables (e.g., agency_users for agency-owned assets).

-- No policies for now - service_role access only
-- DROP POLICY IF EXISTS "storage_assets owner select" ON public.storage_assets;

COMMIT;
