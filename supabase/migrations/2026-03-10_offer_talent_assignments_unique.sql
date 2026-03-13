BEGIN;

-- Consolidated migration (2026-03-07 .. 2026-03-10)

-- 2026-03-07_add_package_meta.sql
-- Add metadata column to agency_talent_packages for extensible flags like wizard_source
ALTER TABLE public.agency_talent_packages
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_agency_talent_packages_meta
  ON public.agency_talent_packages
  USING gin (meta);

-- 2026-03-07_add_signed_document_url_to_contracts.sql
-- Add signed_document_url to campaign_offer_contracts for storing the final signed PDF URL
ALTER TABLE public.campaign_offer_contracts
  ADD COLUMN IF NOT EXISTS signed_document_url text;

-- 2026-03-08_fix_bookings_talent_fk.sql
-- Ensure talent_id correctly references agency_users for nested joins in Postgrest
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_talent_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_talent_id_fkey
  FOREIGN KEY (talent_id) REFERENCES public.agency_users(id) ON DELETE SET NULL;

-- 2026-03-09_booking_deliverables_brand_feedback.sql
-- Add brand review fields to booking_deliverables to allow agencies/creators to see brand feedback.
ALTER TABLE public.booking_deliverables
  ADD COLUMN IF NOT EXISTS brand_status text
    CHECK (brand_status IN ('submitted', 'brand_review', 'changes_requested', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS brand_review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by_brand_at timestamptz;

-- 2026-03-08_add_draft_to_deliverables_status.sql
-- 2026-03-10_offer_deliverables_brand_approved.sql
-- Final constraint includes both 'draft' and 'brand_approved' and keeps default = 'draft'
ALTER TABLE public.campaign_offer_deliverables
  DROP CONSTRAINT IF EXISTS campaign_offer_deliverables_status_check;

ALTER TABLE public.campaign_offer_deliverables
  ADD CONSTRAINT campaign_offer_deliverables_status_check
    CHECK (status IN (
      'draft',
      'submitted',
      'agency_review',
      'brand_review',
      'brand_approved',
      'changes_requested',
      'approved',
      'rejected'
    ));

ALTER TABLE public.campaign_offer_deliverables
  ALTER COLUMN status SET DEFAULT 'draft';

-- 2026-03-10_offer_talent_assignments_unique.sql
-- Ensure we have a real UNIQUE constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_offer_talent_assignments_offer_talent_all'
  ) THEN
    ALTER TABLE public.offer_talent_assignments
      ADD CONSTRAINT uq_offer_talent_assignments_offer_talent_all
      UNIQUE (offer_id, talent_id);
  END IF;
END $$;

COMMIT;
