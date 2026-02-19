-- Migration: Add payout_percent to performance_tiers and tier snapshot to agency_users
-- Each tier now carries a configurable payout_percent which determines what share of the
-- talent pool (after agency commission) each talent receives, weighted by their tier.

BEGIN;

-- 1. Add payout_percent column to performance_tiers
--    Default values: Premium=40%, Core=30%, Growth=20%, Inactive=10%
ALTER TABLE public.performance_tiers
    ADD COLUMN IF NOT EXISTS payout_percent numeric(5,2) NOT NULL DEFAULT 25.00;

-- Set sensible defaults per tier
UPDATE public.performance_tiers SET payout_percent = 40.00 WHERE tier_name = 'Premium';
UPDATE public.performance_tiers SET payout_percent = 30.00 WHERE tier_name = 'Core';
UPDATE public.performance_tiers SET payout_percent = 20.00 WHERE tier_name = 'Growth';
UPDATE public.performance_tiers SET payout_percent = 10.00 WHERE tier_name = 'Inactive';

-- 2. Allow agencies to update payout_percent on their tiers via RLS
--    (Agencies manage their own tiers via the backend API, not direct DB writes.)
--    No new policy needed: the existing "anyone can read tiers" is SELECT-only.
--    Agency-specific overrides are stored in agencies.performance_config (jsonb).

-- 3. Extend agencies.performance_config column default to include payout_percent
--    so new agencies get working defaults out of the box.
ALTER TABLE public.agencies
    ALTER COLUMN performance_config SET DEFAULT '{
      "Premium":  {"min_earnings": 5000, "min_bookings": 8,  "payout_percent": 40},
      "Core":     {"min_earnings": 2500, "min_bookings": 5,  "payout_percent": 30},
      "Growth":   {"min_earnings": 500,  "min_bookings": 1,  "payout_percent": 20},
      "Inactive": {"min_earnings": 0,    "min_bookings": 0,  "payout_percent": 10}
    }'::jsonb;

-- Backfill payout_percent into existing agencies that already have performance_config
-- (only updates tier entries that do NOT yet have a payout_percent key)
UPDATE public.agencies
SET performance_config = performance_config
    || jsonb_build_object(
        'Premium',  COALESCE(performance_config->'Premium',  '{}'::jsonb) || '{"payout_percent": 40}'::jsonb,
        'Core',     COALESCE(performance_config->'Core',     '{}'::jsonb) || '{"payout_percent": 30}'::jsonb,
        'Growth',   COALESCE(performance_config->'Growth',   '{}'::jsonb) || '{"payout_percent": 20}'::jsonb,
        'Inactive', COALESCE(performance_config->'Inactive', '{}'::jsonb) || '{"payout_percent": 10}'::jsonb
       )
WHERE performance_config IS NOT NULL
  AND NOT (performance_config->'Premium' ? 'payout_percent');

-- 4. Add performance_tier_name to agency_users to cache the last-computed tier
--    This allows the payment-link generation code to look up each talent's tier
--    without re-running the full tier-assignment logic at payout time.
ALTER TABLE public.agency_users
    ADD COLUMN IF NOT EXISTS performance_tier_name text;

-- Comment documentation
COMMENT ON COLUMN public.performance_tiers.payout_percent IS
    'Percentage of the talent pool this tier receives per talent. Used to weight payout splits. Sum across tiers need not equal 100 — weights are normalized per active talent set.';
COMMENT ON COLUMN public.agency_users.performance_tier_name IS
    'Cached performance tier name (matches performance_tiers.tier_name). Refreshed by the roster endpoint.';
COMMENT ON COLUMN public.agencies.performance_config IS
    'Per-agency overrides for performance tier thresholds and payout weights (JSON: {TierName: {min_earnings, min_bookings, payout_percent}})';

COMMIT;
