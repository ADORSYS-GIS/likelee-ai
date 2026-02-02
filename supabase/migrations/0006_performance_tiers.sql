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

COMMIT;
