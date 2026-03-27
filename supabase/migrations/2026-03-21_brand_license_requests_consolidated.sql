-- Consolidated migration for brand license requests feature
-- Combines: 2026-03-21, 2026-03-23 (custom_terms), 2026-03-23 (nullable_agency)

BEGIN;

-- Create brand_license_requests table
CREATE TABLE IF NOT EXISTS public.brand_license_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- Nullable to support independent creators
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
  talent_name text,
  campaign_title text,
  description text,
  category text,
  exclusivity text,
  modifications_allowed text,
  custom_terms text, -- Added for additional terms
  territory text,
  usage_scope text,
  license_fee numeric,
  duration_days integer,
  license_start_date date,
  license_end_date date,
  status text NOT NULL DEFAULT 'pending',
  decline_reason text,
  submission_id uuid REFERENCES public.license_submissions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_license_requests_brand
  ON public.brand_license_requests (brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_license_requests_agency
  ON public.brand_license_requests (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_license_requests_status
  ON public.brand_license_requests (status);

-- Enable RLS
ALTER TABLE public.brand_license_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brands
DROP POLICY IF EXISTS "Brands can view own brand license requests"
  ON public.brand_license_requests;
CREATE POLICY "Brands can view own brand license requests"
  ON public.brand_license_requests FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create own brand license requests"
  ON public.brand_license_requests;
CREATE POLICY "Brands can create own brand license requests"
  ON public.brand_license_requests FOR INSERT
  WITH CHECK (brand_id = auth.uid());

-- RLS Policies for agencies
DROP POLICY IF EXISTS "Agencies can view assigned brand license requests"
  ON public.brand_license_requests;
CREATE POLICY "Agencies can view assigned brand license requests"
  ON public.brand_license_requests FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can update assigned brand license requests"
  ON public.brand_license_requests;
CREATE POLICY "Agencies can update assigned brand license requests"
  ON public.brand_license_requests FOR UPDATE
  USING (agency_id = auth.uid());

-- Add reference column to license_submissions
ALTER TABLE public.license_submissions
  ADD COLUMN IF NOT EXISTS brand_request_id uuid
  REFERENCES public.brand_license_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_license_submissions_brand_request
  ON public.license_submissions (brand_request_id);

COMMIT;
