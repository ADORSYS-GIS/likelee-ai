-- 012_performance_tiers.sql
-- Consolidated migration for performance tiers
-- Source files: 0006_performance_tiers.sql, 0041_performance_tiers_agency_config.sql,
-- 0042_performance_tier_payout_percent.sql, 0042_performance_tiers_stats_sources.sql,
-- 2026-05-04_fix_performance_stats_bookings_agency_filter.sql,
-- 2026-05-04_fix_performance_stats_licensing_earnings.sql

BEGIN;

-- ============================================================================
-- 1. PERFORMANCE TIERS TABLE (agency-scoped)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.performance_tiers (
    -- Note: id column dropped in migration to agency-scoped
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    tier_name text NOT NULL,
    
    -- Thresholds (each agency defines their own)
    min_monthly_earnings numeric(12,2) NOT NULL,
    min_monthly_bookings integer NOT NULL,
    
    -- Payout weight
    payout_percent numeric(5,2) NOT NULL DEFAULT 25.00,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    PRIMARY KEY (agency_id, tier_name)
);

CREATE INDEX IF NOT EXISTS idx_performance_tiers_agency ON public.performance_tiers(agency_id);

COMMENT ON TABLE public.performance_tiers IS 'Agency-scoped performance tier thresholds';
COMMENT ON COLUMN public.performance_tiers.tier_name IS 'Static tier label (Premium/Core/Growth)';
COMMENT ON COLUMN public.performance_tiers.min_monthly_earnings IS 'Minimum monthly earnings threshold in USD';
COMMENT ON COLUMN public.performance_tiers.min_monthly_bookings IS 'Minimum monthly booking threshold';
COMMENT ON COLUMN public.performance_tiers.payout_percent IS 'Percentage of the talent pool this tier receives per talent';

ALTER TABLE public.performance_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency can read own performance tiers" ON public.performance_tiers;
CREATE POLICY "agency can read own performance tiers" ON public.performance_tiers
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency can write own performance tiers" ON public.performance_tiers;
CREATE POLICY "agency can write own performance tiers" ON public.performance_tiers
    FOR ALL USING (auth.uid() = agency_id)
    WITH CHECK (auth.uid() = agency_id);

-- ============================================================================
-- 2. GET AGENCY PERFORMANCE STATS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_agency_performance_stats(
    p_agency_id UUID,
    p_earnings_start_date DATE,
    p_bookings_start_date DATE
)
RETURNS TABLE (
    talent_id UUID,
    earnings_cents BIGINT,
    booking_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH
payment_earnings AS (
    SELECT
        p.talent_id,
        SUM(COALESCE(p.talent_earnings_cents, 0))::BIGINT AS amount_cents
    FROM public.payments p
    WHERE p.agency_id = p_agency_id
        AND p.status IN ('successful', 'succeeded')
        AND COALESCE(p.paid_at, p.created_at) >= p_earnings_start_date::timestamptz
    GROUP BY p.talent_id
),
licensing_earnings AS (
    SELECT
        (split->>'talent_id')::uuid AS talent_id,
        SUM(COALESCE((split->>'amount_cents')::bigint, 0))::BIGINT AS amount_cents
    FROM public.licensing_payouts lp
    CROSS JOIN jsonb_array_elements(lp.talent_splits) AS split
    WHERE lp.agency_id = p_agency_id
        AND COALESCE(lp.paid_at, lp.created_at) >= p_earnings_start_date::timestamptz
    GROUP BY split->>'talent_id'
),
earnings AS (
    SELECT
        talent_id,
        SUM(amount_cents)::BIGINT AS total_earnings
    FROM (
        SELECT * FROM payment_earnings
        UNION ALL
        SELECT * FROM licensing_earnings
    ) u
    GROUP BY talent_id
),
bookings AS (
    SELECT
        b.talent_id,
        COUNT(*)::BIGINT AS total_bookings
    FROM public.bookings b
    WHERE b.agency_id = p_agency_id
        AND b.status IN ('confirmed', 'completed')
        AND b.created_at >= p_bookings_start_date::timestamptz
        AND (
            COALESCE(
                CASE
                    WHEN b.usage_duration ~* '^\s*\d+\s*(m|min|mins|minute|minutes)\s*$' THEN
                        b.created_at + ((regexp_replace(lower(b.usage_duration), '[^0-9]', '', 'g') || ' minutes')::interval)
                    WHEN b.usage_duration ~* '^\s*\d+\s*(h|hr|hrs|hour|hours)\s*$' THEN
                        b.created_at + ((regexp_replace(lower(b.usage_duration), '[^0-9]', '', 'g') || ' hours')::interval)
                    ELSE NULL
                END,
                b.created_at
            ) <= now()
        )
    GROUP BY b.talent_id
)
SELECT
    COALESCE(e.talent_id, b.talent_id) AS talent_id,
    COALESCE(e.total_earnings, 0) AS earnings_cents,
    COALESCE(b.total_bookings, 0) AS booking_count
FROM earnings e
FULL OUTER JOIN bookings b ON e.talent_id = b.talent_id
WHERE COALESCE(e.talent_id, b.talent_id) IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) TO authenticated, service_role;

-- ============================================================================
-- 4. UPDATED_AT TRIGGER (from 0006)
-- ============================================================================
DROP TRIGGER IF EXISTS update_performance_tiers_updated_at ON public.performance_tiers;
CREATE TRIGGER update_performance_tiers_updated_at
    BEFORE UPDATE ON public.performance_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
