BEGIN;

ALTER TABLE public.brand_activity_events
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.brand_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_type text,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS idx_brand_activity_events_campaign_created
  ON public.brand_activity_events (campaign_id, created_at DESC);

COMMIT;
