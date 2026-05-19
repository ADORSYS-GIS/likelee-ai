-- Support multiple comp-card uploads per job application
-- Generated: 2026-04-02

BEGIN;

-- Add comp_cards jsonb column to job_applications
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS comp_cards jsonb;

-- Default to empty array to simplify reads
UPDATE public.job_applications
SET comp_cards = '[]'::jsonb
WHERE comp_cards IS NULL;

-- Create GIN index for performance on JSONB operations
CREATE INDEX IF NOT EXISTS idx_job_applications_comp_cards
  ON public.job_applications USING GIN (comp_cards);

COMMIT;
