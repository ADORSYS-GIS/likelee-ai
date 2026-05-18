BEGIN;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS studio_addon_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS studio_addon_activated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_agencies_studio_addon_active
  ON public.agencies(studio_addon_active);

-- Brand studio add-on is now a one-time purchase (not a recurring subscription).
-- Add the activation timestamp column; studio_addon_active already exists.
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS studio_addon_activated_at timestamptz;

COMMIT;
