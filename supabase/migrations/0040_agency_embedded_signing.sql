BEGIN;

ALTER TABLE public.license_submissions
  ADD COLUMN IF NOT EXISTS requires_agency_signature BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agency_submitter_id BIGINT,
  ADD COLUMN IF NOT EXISTS agency_submitter_slug TEXT,
  ADD COLUMN IF NOT EXISTS agency_embed_src TEXT,
  ADD COLUMN IF NOT EXISTS agency_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_submitter_id BIGINT,
  ADD COLUMN IF NOT EXISTS client_submitter_slug TEXT;

ALTER TABLE public.license_submissions
  DROP CONSTRAINT IF EXISTS license_submissions_status_check;

ALTER TABLE public.license_submissions
  ADD CONSTRAINT license_submissions_status_check CHECK (
    status IN (
      'draft',
      'sent',
      'agency_pending',
      'client_pending',
      'opened',
      'signed',
      'declined',
      'archived',
      'completed'
    )
  );

CREATE INDEX IF NOT EXISTS idx_license_submissions_requires_agency_signature
  ON public.license_submissions(requires_agency_signature);

CREATE INDEX IF NOT EXISTS idx_license_submissions_agency_submitter_id
  ON public.license_submissions(agency_submitter_id);

COMMIT;
