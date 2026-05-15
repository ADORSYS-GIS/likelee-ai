BEGIN;

-- Track Veriff usage per agency for monthly cap enforcement
CREATE TABLE IF NOT EXISTS public.agency_veriff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  veriff_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_veriff_sessions_agency_created
  ON public.agency_veriff_sessions(agency_id, created_at DESC);

ALTER TABLE public.agency_veriff_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_veriff_sessions select own" ON public.agency_veriff_sessions;
CREATE POLICY "agency_veriff_sessions select own" ON public.agency_veriff_sessions
  FOR SELECT USING (auth.uid() = agency_id);

COMMIT;
