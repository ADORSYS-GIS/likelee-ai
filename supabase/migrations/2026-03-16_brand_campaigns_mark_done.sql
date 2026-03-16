BEGIN;

ALTER TABLE public.brand_campaigns
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.brand_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject_table text,
  subject_id uuid,
  title text,
  subtitle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_activity_events_brand_created
  ON public.brand_activity_events (brand_id, created_at DESC);

ALTER TABLE public.brand_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can view own activity events"
  ON public.brand_activity_events FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can insert own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can insert own activity events"
  ON public.brand_activity_events FOR INSERT
  WITH CHECK (brand_id = auth.uid());

COMMIT;
