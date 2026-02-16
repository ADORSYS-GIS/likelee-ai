-- Migration: Commission Management
BEGIN;

-- 1. Add custom_commission_rate to agency_users
ALTER TABLE public.agency_users
ADD COLUMN IF NOT EXISTS custom_commission_rate NUMERIC(10, 2);

-- 2. Create talent_commission_history table
CREATE TABLE IF NOT EXISTS public.talent_commission_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_user_id UUID NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    old_rate NUMERIC(10, 2),
    new_rate NUMERIC(10, 2) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.talent_commission_history ENABLE ROW LEVEL SECURITY;

-- Policies for history
-- Agency owners can view history for their agency
CREATE POLICY "Agency owners can view history" ON public.talent_commission_history
    FOR SELECT
    USING (auth.uid() = agency_id);

COMMIT;
