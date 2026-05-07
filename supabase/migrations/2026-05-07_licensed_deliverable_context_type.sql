-- Add licensed_deliverable context type for brand licensed asset library
-- These are auto-generated deliverables when a brand pays for a license

BEGIN;

-- Drop and recreate the check constraint with the new context type
ALTER TABLE public.storage_assets
  DROP CONSTRAINT IF EXISTS storage_assets_context_type_check;

ALTER TABLE public.storage_assets
  ADD CONSTRAINT storage_assets_context_type_check
  CHECK (context_type IN (
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
    'studio_document',
    'brand_storage',
    'studio_generation',
    'licensed_deliverable'
  ));

-- Create table for licensed deliverables (asset library for brands)
CREATE TABLE IF NOT EXISTS public.brand_licensed_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  license_request_id uuid REFERENCES public.brand_license_requests(id) ON DELETE SET NULL,
  talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
  
  -- Asset details
  asset_type text NOT NULL CHECK (asset_type IN ('profile_photo', 'voice_recording', 'portfolio_image')),
  asset_name text NOT NULL,
  asset_url text NOT NULL,
  
  -- Source references
  source_table text,
  source_id text,
  
  -- Metadata
  mime_type text,
  size_bytes bigint,
  
  -- Talent info for display
  talent_name text,
  campaign_title text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_licensed_deliverables_brand
  ON public.brand_licensed_deliverables(brand_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_brand_licensed_deliverables_license_request
  ON public.brand_licensed_deliverables(license_request_id);
CREATE INDEX IF NOT EXISTS idx_brand_licensed_deliverables_type
  ON public.brand_licensed_deliverables(brand_id, asset_type, deleted_at);

-- RLS
ALTER TABLE public.brand_licensed_deliverables ENABLE ROW LEVEL SECURITY;

-- Brands can view and manage their own deliverables
DROP POLICY IF EXISTS "Brands can view own licensed deliverables" ON public.brand_licensed_deliverables;
CREATE POLICY "Brands can view own licensed deliverables"
  ON public.brand_licensed_deliverables FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can delete own licensed deliverables" ON public.brand_licensed_deliverables;
CREATE POLICY "Brands can delete own licensed deliverables"
  ON public.brand_licensed_deliverables FOR UPDATE
  USING (brand_id = auth.uid());

-- Add index for efficient storage_assets lookups
CREATE INDEX IF NOT EXISTS idx_storage_assets_licensed_deliverable
  ON public.storage_assets(owner_type, owner_id, context_type, deleted_at)
  WHERE context_type = 'licensed_deliverable';

COMMIT;
