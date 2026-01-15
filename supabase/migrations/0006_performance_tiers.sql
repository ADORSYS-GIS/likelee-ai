-- Performance Tiers Schema

-- 1. Performance Tier Definitions Table
CREATE TABLE IF NOT EXISTS performance_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    tier_level INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Talent Performance Metrics Table
CREATE TABLE IF NOT EXISTS talent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
    
    -- Earnings metrics
    total_lifetime_earnings DECIMAL(12, 2) DEFAULT 0,
    avg_monthly_earnings DECIMAL(12, 2) DEFAULT 0,
    last_30_days_earnings DECIMAL(12, 2) DEFAULT 0,
    
    -- Booking metrics
    total_bookings INTEGER DEFAULT 0,
    avg_booking_frequency DECIMAL(5, 2) DEFAULT 0, 
    last_booking_date TIMESTAMPTZ,
    days_since_last_booking INTEGER,
    
    -- Engagement metrics
    total_campaigns INTEGER DEFAULT 0,
    engagement_percentage DECIMAL(5, 2) DEFAULT 0,
    
    -- Tier assignment
    current_tier_id UUID REFERENCES performance_tiers(id),
    tier_assigned_at TIMESTAMPTZ,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(profile_id, agency_id)
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_talent_metrics_profile ON talent_performance_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_talent_metrics_agency ON talent_performance_metrics(agency_id);
CREATE INDEX IF NOT EXISTS idx_talent_metrics_tier ON talent_performance_metrics(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_talent_metrics_earnings ON talent_performance_metrics(avg_monthly_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_talent_metrics_last_booking ON talent_performance_metrics(last_booking_date DESC);

-- 4. Seed Tier Definitions
INSERT INTO performance_tiers (tier_name, tier_level) VALUES
('Premium', 1),
('Core', 2),
('Growth', 3),
('Inactive', 4)
ON CONFLICT (tier_name) DO NOTHING;

-- 5. Update Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_performance_tiers_updated_at
    BEFORE UPDATE ON performance_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_talent_metrics_updated_at
    BEFORE UPDATE ON talent_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Comments for Documentation
COMMENT ON TABLE performance_tiers IS 'Defines the 4 performance tiers (Premium, Core, Growth, Inactive) with their criteria and recommendations';
COMMENT ON TABLE talent_performance_metrics IS 'Stores calculated performance metrics for each talent, used for tier assignment';
COMMENT ON COLUMN talent_performance_metrics.total_lifetime_earnings IS 'Cumulative earnings since talent joined the agency';
COMMENT ON COLUMN talent_performance_metrics.avg_monthly_earnings IS 'Primary metric for tier assignment - average monthly earnings';
COMMENT ON COLUMN talent_performance_metrics.avg_booking_frequency IS 'Average number of bookings per month';
COMMENT ON COLUMN talent_performance_metrics.days_since_last_booking IS 'Used to identify inactive talent (60+ days)';
