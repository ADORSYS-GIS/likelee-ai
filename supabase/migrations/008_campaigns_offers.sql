-- 008_campaigns_offers.sql
-- Consolidated migration for agency campaigns (not brand campaigns)
-- Source files: 0003_assets_storage_moderation.sql (campaigns first def),
-- 0007_agency_talent_management.sql (campaigns redef), 0006_performance_tiers.sql,
-- 0014_license_templates.sql, 0015_license_submissions.sql, 20260218_fix_campaigns_agency_percent.sql,
-- 2026-02-18_payments_commission_columns.sql

BEGIN;

-- ============================================================================
-- 1. CAMPAIGNS TABLE (Agency-side, not brand campaigns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    -- Linked licensing request (for billing stubs)
    licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
    
    -- Campaign Details
    name text,
    campaign_type text NOT NULL DEFAULT 'Photoshoot' CHECK (campaign_type IN ('Photoshoot', 'Event', 'Endorsement')),
    brand_vertical text,
    region text,
    
    -- Timing
    start_at timestamptz,
    end_at timestamptz,
    date date,
    
    -- Payment
    payment_amount numeric(12,2),
    agency_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (agency_percent >= 0 AND agency_percent <= 100),
    talent_percent numeric(5,2) NOT NULL DEFAULT 100 CHECK (talent_percent >= 0 AND talent_percent <= 100),
    
    -- Computed earnings
    agency_earnings_cents bigint NOT NULL DEFAULT 0,
    talent_earnings_cents bigint NOT NULL DEFAULT 0,
    
    -- Commission tracking
    commission_bps integer DEFAULT 2000,
    commission_cents bigint DEFAULT 0,
    
    -- Status
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT campaigns_split_sum_check CHECK ((agency_percent + talent_percent) = 100)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_agency_id ON public.campaigns(agency_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand_id ON public.campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_talent_id ON public.campaigns(talent_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_date ON public.campaigns(date);
CREATE INDEX IF NOT EXISTS idx_campaigns_agency_date ON public.campaigns(agency_id, date);
CREATE INDEX IF NOT EXISTS idx_campaigns_licensing_request ON public.campaigns(licensing_request_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view campaigns for their talents" ON public.campaigns;
CREATE POLICY "Agencies can view campaigns for their talents" ON public.campaigns
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_users au
            WHERE au.id = talent_id AND au.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Agencies can manage campaigns for their talents" ON public.campaigns;
CREATE POLICY "Agencies can manage campaigns for their talents" ON public.campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.agency_users au
            WHERE au.id = talent_id AND au.agency_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agency_users au
            WHERE au.id = talent_id AND au.agency_id = auth.uid()
        )
    );

-- ============================================================================
-- 2. CAMPAIGN EARNINGS COMPUTATION TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.campaigns_compute_earnings()
RETURNS trigger AS $$
DECLARE
    gross_cents bigint;
    talent_cents bigint;
    agency_cents bigint;
BEGIN
    gross_cents := COALESCE(ROUND(COALESCE(NEW.payment_amount, 0) * 100.0), 0);

    talent_cents := COALESCE(ROUND(gross_cents * (COALESCE(NEW.talent_percent, 0) / 100.0)), 0);
    agency_cents := gross_cents - talent_cents;

    NEW.talent_earnings_cents := COALESCE(talent_cents, 0);
    NEW.agency_earnings_cents := COALESCE(agency_cents, 0);
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_compute_earnings_trigger ON public.campaigns;
CREATE TRIGGER campaigns_compute_earnings_trigger
    BEFORE INSERT OR UPDATE OF payment_amount, agency_percent, talent_percent
    ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.campaigns_compute_earnings();

COMMIT;
