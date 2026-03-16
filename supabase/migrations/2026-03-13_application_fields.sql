-- Consolidated migration for job postings and applications updates
-- Includes: Social links, Comp Card fields, Acceptance tracking, Indexes, and RLS refinements.

BEGIN;

-- 1. Add social and comp card columns to job_applications
ALTER TABLE public.job_applications 
  ADD COLUMN IF NOT EXISTS portfolio_link text,
  ADD COLUMN IF NOT EXISTS github_link text,
  ADD COLUMN IF NOT EXISTS linkedin_link text,
  ADD COLUMN IF NOT EXISTS comp_card_name text,
  ADD COLUMN IF NOT EXISTS comp_card_url text,
  ADD COLUMN IF NOT EXISTS comp_card_path text;

-- 2. Add acceptance tracking to job_postings
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS accepted_agency_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepted_creator_ids uuid[] DEFAULT '{}';

-- 3. Performance Indexes
-- B-Tree indexes for single-value lookups
CREATE INDEX IF NOT EXISTS idx_job_applications_portfolio_link ON public.job_applications (portfolio_link);
CREATE INDEX IF NOT EXISTS idx_job_applications_github_link ON public.job_applications (github_link);
CREATE INDEX IF NOT EXISTS idx_job_applications_linkedin_link ON public.job_applications (linkedin_link);
CREATE INDEX IF NOT EXISTS idx_job_applications_comp_card_name ON public.job_applications (comp_card_name);
CREATE INDEX IF NOT EXISTS idx_job_applications_comp_card_url ON public.job_applications (comp_card_url);
CREATE INDEX IF NOT EXISTS idx_job_applications_comp_card_path ON public.job_applications (comp_card_path);

-- GIN indexes for array containment queries (essential for invite/acceptance checks)
-- Note: "Step 5" in UI usually refers to Collaboration Preferences, which includes these arrays.
CREATE INDEX IF NOT EXISTS idx_job_postings_invited_agency_ids ON public.job_postings USING GIN (invited_agency_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_invited_creator_ids ON public.job_postings USING GIN (invited_creator_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_accepted_agency_ids ON public.job_postings USING GIN (accepted_agency_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_accepted_creator_ids ON public.job_postings USING GIN (accepted_creator_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_declined_agency_ids ON public.job_postings USING GIN (declined_agency_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_declined_creator_ids ON public.job_postings USING GIN (declined_creator_ids);

-- 4. Refined RLS Policy for job_postings
-- Allow SELECT for all authenticated users so jobs appear on the public board.
-- Confidential detail redaction is handled by the backend.
DROP POLICY IF EXISTS "job_postings_select" ON public.job_postings;
CREATE POLICY "job_postings_select"
  ON public.job_postings
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Refined RLS Policy for job_applications
-- Ensure applicants can see their own applications and brands can see applications for their jobs.
DROP POLICY IF EXISTS "job_applications_select" ON public.job_applications;
CREATE POLICY "job_applications_select"
  ON public.job_applications
  FOR SELECT
  TO authenticated
  USING (
    applicant_id = auth.uid()
    OR job_id IN (SELECT id FROM public.job_postings WHERE brand_id = auth.uid())
  );
-- 6. Strict RLS for brand_agency_connections (Owner only)
-- Note: These tables only permit access to the brand ID or the exact agency owner ID. Roster members cannot view connections.
DROP POLICY IF EXISTS "Brands can view their agency connections" ON public.brand_agency_connections;
CREATE POLICY "Brands can view their agency connections"
  ON public.brand_agency_connections
  FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view their brand connections" ON public.brand_agency_connections;
CREATE POLICY "Agencies can view their brand connections"
  ON public.brand_agency_connections
  FOR SELECT
  USING (agency_id = auth.uid());

-- 7. Data Sanitization for explicit HTTPS protocols on external links
UPDATE public.job_applications
SET portfolio_link = 'https://' || portfolio_link
WHERE portfolio_link IS NOT NULL AND portfolio_link != '' AND portfolio_link NOT LIKE 'http%';

UPDATE public.job_applications
SET github_link = 'https://' || github_link
WHERE github_link IS NOT NULL AND github_link != '' AND github_link NOT LIKE 'http%';

UPDATE public.job_applications
SET linkedin_link = 'https://' || linkedin_link
WHERE linkedin_link IS NOT NULL AND linkedin_link != '' AND linkedin_link NOT LIKE 'http%';

COMMIT;
