-- Migration: Commission Management Refactored (v3)
BEGIN;

-- 1. Create talent_commissions table for CURRENT custom rates
CREATE TABLE public.talent_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id UUID NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    commission_rate NUMERIC(10, 2) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure only one custom rate record per talent per agency
    CONSTRAINT unique_talent_agency_commission UNIQUE (talent_id, agency_id)
);

-- 2. Add commission_rate to licensing_payouts for transaction history
ALTER TABLE public.licensing_payouts 
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(10, 2);

COMMENT ON COLUMN public.licensing_payouts.commission_rate IS 'The commission rate percentage used for this specific payout record.';

-- Enable RLS
ALTER TABLE public.talent_commissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Agency owners can view talent commissions" ON public.talent_commissions
    FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Agency owners can insert talent commissions" ON public.talent_commissions
    FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Agency owners can update talent commissions" ON public.talent_commissions
    FOR UPDATE USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Agency owners can delete talent commissions" ON public.talent_commissions
    FOR DELETE USING (agency_id = auth.uid());

COMMIT;
