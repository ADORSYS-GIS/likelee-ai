-- Add talent_ids (uuid array) to license_submissions for multi-talent support.
-- One licensing_request will be created per talent on finalize.
ALTER TABLE public.license_submissions
    ADD COLUMN IF NOT EXISTS talent_ids uuid[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_license_submissions_talent_ids ON public.license_submissions USING GIN(talent_ids);
