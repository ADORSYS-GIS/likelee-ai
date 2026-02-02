-- Performance Tiers Schema (Simplified)
BEGIN;

-- Table for tier definitions (just labels and logic levels now)
CREATE TABLE IF NOT EXISTS public.performance_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    tier_level INTEGER NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_performance_tiers_level ON public.performance_tiers(tier_level ASC);

-- Seed tier definitions (no hardcoded thresholds here anymore)
INSERT INTO public.performance_tiers (tier_name, tier_level, description) VALUES
('Premium', 1, 'Top-performing talent with highest earnings and booking frequency'),
('Core', 2, 'Consistently performing talent with solid earnings and regular bookings'),
('Growth', 3, 'Developing talent with moderate activity'),
('Inactive', 4, 'Talent requiring attention or inactive')
ON CONFLICT (tier_name) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

-- Add custom config storage to agencies
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS performance_config jsonb DEFAULT '{
  "Premium": {"min_earnings": 5000, "min_bookings": 8},
  "Core": {"min_earnings": 2500, "min_bookings": 5},
  "Growth": {"min_earnings": 500, "min_bookings": 1}
}'::jsonb;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_performance_tiers_updated_at ON public.performance_tiers;
CREATE TRIGGER update_performance_tiers_updated_at
    BEFORE UPDATE ON public.performance_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.performance_tiers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read tier definitions
DROP POLICY IF EXISTS "anyone can read tiers" ON public.performance_tiers;
CREATE POLICY "anyone can read tiers" ON public.performance_tiers
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE public.performance_tiers IS 'Defines the 4 performance tiers labels and levels';
COMMENT ON COLUMN public.performance_tiers.tier_level IS 'Tier ranking (1=highest, 4=lowest)';
COMMENT ON COLUMN public.agencies.performance_config IS 'Custom performance tier thresholds for this agency';

-- Optimizations and Aggregation RPC
-- 1. Ensure efficient indexes for range queries
CREATE INDEX IF NOT EXISTS idx_campaigns_agency_date ON public.campaigns(agency_id, date);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bookings_agency_date ON public.bookings(agency_user_id, date);

-- 2. Aggregation RPC
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH earnings AS (
        SELECT 
            c.talent_id,
            SUM(c.talent_earnings_cents) as total_earnings
        FROM public.campaigns c
        WHERE c.agency_id = p_agency_id
          AND c.status = 'Completed'
          AND c.date >= p_earnings_start_date
        GROUP BY c.talent_id
    ),
    bookings AS (
        SELECT 
            b.talent_id,
            COUNT(*) as total_bookings
        FROM public.bookings b
        WHERE b.agency_user_id = p_agency_id
          AND b.status IN ('confirmed', 'completed')
          AND b.date >= p_bookings_start_date
        GROUP BY b.talent_id
    )
    SELECT 
        COALESCE(e.talent_id, b.talent_id) as talent_id,
        COALESCE(e.total_earnings, 0) as earnings_cents,
        COALESCE(b.total_bookings, 0) as booking_count
    FROM earnings e
    FULL OUTER JOIN bookings b ON e.talent_id = b.talent_id
    WHERE COALESCE(e.talent_id, b.talent_id) IS NOT NULL;
END;
$$;

-- Grant access
REVOKE ALL ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) TO authenticated, service_role;

COMMIT;
