-- Performance Tiers Schema (Simplified)

BEGIN;

-- Table for tier definitions with thresholds
CREATE TABLE IF NOT EXISTS public.performance_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    tier_level INTEGER NOT NULL UNIQUE,
    min_monthly_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
    min_monthly_bookings INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_performance_tiers_level ON public.performance_tiers(tier_level ASC);

-- Seed tier definitions with thresholds from requirements
INSERT INTO public.performance_tiers (tier_name, tier_level, min_monthly_earnings, min_monthly_bookings, description) VALUES
('Premium', 1, 5000.00, 9, 'Top-performing talent with highest earnings and booking frequency'),
('Core', 2, 2500.00, 5, 'Consistently performing talent with solid earnings and regular bookings'),
('Growth', 3, 500.00, 1, 'Developing talent with moderate activity'),
('Inactive', 4, 0.00, 0, 'Talent requiring attention or inactive')
ON CONFLICT (tier_name) DO UPDATE SET
    min_monthly_earnings = EXCLUDED.min_monthly_earnings,
    min_monthly_bookings = EXCLUDED.min_monthly_bookings,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
COMMENT ON TABLE public.performance_tiers IS 'Defines the 4 performance tiers with minimum thresholds for monthly earnings and bookings';
COMMENT ON COLUMN public.performance_tiers.min_monthly_earnings IS 'Minimum average monthly earnings ($) required for this tier';
COMMENT ON COLUMN public.performance_tiers.min_monthly_bookings IS 'Minimum monthly bookings count required for this tier';
COMMENT ON COLUMN public.performance_tiers.tier_level IS 'Tier ranking (1=highest, 4=lowest)';

COMMIT;
