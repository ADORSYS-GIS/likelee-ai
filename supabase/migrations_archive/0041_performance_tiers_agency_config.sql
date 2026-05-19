BEGIN;

-- Convert performance_tiers from global labels/levels into agency-scoped threshold config.
-- Keep table name to minimize app-level churn.

-- Remove old RLS policy tied to global lookup semantics.
DROP POLICY IF EXISTS "anyone can read tiers" ON public.performance_tiers;

-- Stop using legacy unique/index definitions for global rows.
DROP INDEX IF EXISTS public.idx_performance_tiers_level;
ALTER TABLE public.performance_tiers DROP CONSTRAINT IF EXISTS performance_tiers_tier_name_key;
ALTER TABLE public.performance_tiers DROP CONSTRAINT IF EXISTS performance_tiers_tier_level_key;

-- Add agency-scoped threshold columns.
ALTER TABLE public.performance_tiers
  ADD COLUMN IF NOT EXISTS agency_id UUID,
  ADD COLUMN IF NOT EXISTS min_monthly_earnings NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS min_monthly_bookings INTEGER;

-- Explicit FK for agency ownership.
ALTER TABLE public.performance_tiers
  DROP CONSTRAINT IF EXISTS performance_tiers_agency_id_fkey,
  ADD CONSTRAINT performance_tiers_agency_id_fkey
    FOREIGN KEY (agency_id)
    REFERENCES public.agencies(id)
    ON DELETE CASCADE;

-- Migrate existing per-agency JSON config into row-based storage.
INSERT INTO public.performance_tiers (
  agency_id,
  tier_name,
  min_monthly_earnings,
  min_monthly_bookings,
  created_at,
  updated_at
)
SELECT
  a.id AS agency_id,
  defaults.tier_name,
  defaults.default_earnings::NUMERIC(12,2),
  defaults.default_bookings,
  NOW(),
  NOW()
FROM public.agencies a
CROSS JOIN (
  VALUES
    ('Premium'::TEXT, 5000::NUMERIC, 8::INTEGER),
    ('Core'::TEXT, 2500::NUMERIC, 5::INTEGER),
    ('Growth'::TEXT, 500::NUMERIC, 1::INTEGER)
) AS defaults(tier_name, default_earnings, default_bookings)
ON CONFLICT DO NOTHING;

-- Remove legacy global seed rows (they have no agency_id).
DELETE FROM public.performance_tiers WHERE agency_id IS NULL;

-- Enforce agency-scoped uniqueness and required fields.
ALTER TABLE public.performance_tiers
  ALTER COLUMN agency_id SET NOT NULL,
  ALTER COLUMN min_monthly_earnings SET NOT NULL,
  ALTER COLUMN min_monthly_bookings SET NOT NULL;

ALTER TABLE public.performance_tiers DROP CONSTRAINT IF EXISTS performance_tiers_pkey;
ALTER TABLE public.performance_tiers
  ADD CONSTRAINT performance_tiers_pkey PRIMARY KEY (agency_id, tier_name);

-- Remove columns no longer needed for static taxonomy.
ALTER TABLE public.performance_tiers DROP COLUMN IF EXISTS id;
ALTER TABLE public.performance_tiers DROP COLUMN IF EXISTS tier_level;
ALTER TABLE public.performance_tiers DROP COLUMN IF EXISTS description;

-- Index to keep agency lookups fast.
CREATE INDEX IF NOT EXISTS idx_performance_tiers_agency ON public.performance_tiers(agency_id);

-- Replace RLS policies with agency-scoped policies.
ALTER TABLE public.performance_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency can read own performance tiers" ON public.performance_tiers;
CREATE POLICY "agency can read own performance tiers" ON public.performance_tiers
  FOR SELECT
  USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency can write own performance tiers" ON public.performance_tiers;
CREATE POLICY "agency can write own performance tiers" ON public.performance_tiers
  FOR ALL
  USING (auth.uid() = agency_id)
  WITH CHECK (auth.uid() = agency_id);

-- Drop old json config column now that thresholds are normalized.
ALTER TABLE public.agencies DROP COLUMN IF EXISTS performance_config;

COMMENT ON TABLE public.performance_tiers IS 'Agency-scoped performance tier thresholds';
COMMENT ON COLUMN public.performance_tiers.tier_name IS 'Static tier label (Premium/Core/Growth)';
COMMENT ON COLUMN public.performance_tiers.min_monthly_earnings IS 'Minimum monthly earnings threshold in USD';
COMMENT ON COLUMN public.performance_tiers.min_monthly_bookings IS 'Minimum monthly booking threshold';

COMMIT;
