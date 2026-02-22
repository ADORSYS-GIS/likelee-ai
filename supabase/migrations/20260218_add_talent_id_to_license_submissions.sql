-- Add talent_id to license_submissions so it can be propagated to licensing_requests on finalize
ALTER TABLE public.license_submissions
    ADD COLUMN IF NOT EXISTS talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_license_submissions_talent_id ON public.license_submissions(talent_id);
