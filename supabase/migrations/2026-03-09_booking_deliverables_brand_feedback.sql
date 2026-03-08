-- 2026-03-09_booking_deliverables_brand_feedback.sql
-- Add brand review fields to booking_deliverables to allow agencies/creators to see brand feedback.

ALTER TABLE public.booking_deliverables
ADD COLUMN IF NOT EXISTS brand_status text 
  CHECK (brand_status IN ('submitted', 'brand_review', 'changes_requested', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS brand_review_note text,
ADD COLUMN IF NOT EXISTS reviewed_by_brand_at timestamptz;
