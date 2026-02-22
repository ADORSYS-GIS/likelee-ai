-- Migration: Agency Payment Links and Creator Balance Management
-- Creates tables for payment link generation and talent/creator balance tracking

BEGIN;

-- ============================================
-- 1. Modify existing licensing_payouts table
-- ============================================
-- Add columns to support multiple talent splits in a single payout

ALTER TABLE public.licensing_payouts
    ADD COLUMN IF NOT EXISTS talent_earnings_cents bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS talent_splits jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS payment_link_id uuid,
    ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Drop the NOT NULL constraint on talent_id since we'll have multi-talent payouts
ALTER TABLE public.licensing_payouts
    ALTER COLUMN talent_id DROP NOT NULL;

-- Add index for payment_link lookups
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_payment_link_id ON public.licensing_payouts (payment_link_id);

-- ============================================
-- 2. Create agency_payment_links table
-- ============================================

CREATE TABLE IF NOT EXISTS public.agency_payment_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    licensing_request_id uuid NOT NULL REFERENCES public.licensing_requests(id) ON DELETE CASCADE,
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    
    -- Stripe fields
    stripe_payment_link_id text,
    stripe_payment_link_url text NOT NULL,
    stripe_price_id text,
    stripe_checkout_session_id text,
    stripe_payment_intent_id text,
    
    -- Financial breakdown
    total_amount_cents bigint NOT NULL CHECK (total_amount_cents > 0),
    agency_amount_cents bigint NOT NULL CHECK (agency_amount_cents >= 0),
    talent_amount_cents bigint NOT NULL CHECK (talent_amount_cents >= 0),
    currency text NOT NULL DEFAULT 'USD',
    agency_percent numeric(5,2) NOT NULL DEFAULT 20.00,
    talent_percent numeric(5,2) NOT NULL DEFAULT 80.00,
    
    -- Talent splits (JSON array: [{talent_id, talent_name, amount_cents, stripe_connect_account_id}, ...])
    talent_splits jsonb NOT NULL DEFAULT '[]'::jsonb,
    
    -- Client info
    client_email text,
    client_name text,
    
    -- Status and timestamps
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'expired', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    paid_at timestamptz,
    
    -- Email tracking
    email_sent_at timestamptz,
    email_sent_count integer NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes for agency_payment_links
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_agency_id ON public.agency_payment_links (agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_licensing_request_id ON public.agency_payment_links (licensing_request_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_campaign_id ON public.agency_payment_links (campaign_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_status ON public.agency_payment_links (status);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_stripe_payment_link_id ON public.agency_payment_links (stripe_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_stripe_checkout_session_id ON public.agency_payment_links (stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_stripe_payment_intent_id ON public.agency_payment_links (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_expires_at ON public.agency_payment_links (expires_at);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_paid_at ON public.agency_payment_links (paid_at);

-- Enable RLS
ALTER TABLE public.agency_payment_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agency_payment_links
DROP POLICY IF EXISTS "Agencies can view their own payment links" ON public.agency_payment_links;
CREATE POLICY "Agencies can view their own payment links" ON public.agency_payment_links
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create payment links" ON public.agency_payment_links;
CREATE POLICY "Agencies can create payment links" ON public.agency_payment_links
    FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can update their own payment links" ON public.agency_payment_links;
CREATE POLICY "Agencies can update their own payment links" ON public.agency_payment_links
    FOR UPDATE USING (agency_id = auth.uid());

-- ============================================
-- 3. Create creator_balances table
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'creator_balances'
    ) THEN
        EXECUTE 'DROP VIEW public.creator_balances';
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.creator_balances (
    creator_id uuid PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
    available_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_balances
DROP POLICY IF EXISTS "Creators can view their own balance" ON public.creator_balances;
CREATE POLICY "Creators can view their own balance" ON public.creator_balances
    FOR SELECT USING (creator_id = auth.uid());

-- ============================================
-- 4. Create creator_payout_requests table
-- ============================================

CREATE TABLE IF NOT EXISTS public.creator_payout_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    currency text NOT NULL DEFAULT 'USD',
    payout_method text NOT NULL DEFAULT 'standard' CHECK (payout_method IN ('standard', 'instant')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled')),
    stripe_transfer_id text,
    stripe_payout_id text,
    failure_reason text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for creator_payout_requests
CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_creator_id ON public.creator_payout_requests (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_status ON public.creator_payout_requests (status);
CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_requested_at ON public.creator_payout_requests (requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_stripe_transfer_id ON public.creator_payout_requests (stripe_transfer_id);

-- Enable RLS
ALTER TABLE public.creator_payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_payout_requests
DROP POLICY IF EXISTS "Creators can view their payout requests" ON public.creator_payout_requests;
CREATE POLICY "Creators can view their payout requests" ON public.creator_payout_requests
    FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can create payout requests" ON public.creator_payout_requests;
CREATE POLICY "Creators can create payout requests" ON public.creator_payout_requests
    FOR INSERT WITH CHECK (creator_id = auth.uid());

-- ============================================
-- 5. Update licensing_payouts RLS policies for multi-talent support
-- ============================================

-- Modify the talent view policy to work with talent_splits JSONB
DROP POLICY IF EXISTS "Talents can view their licensing payouts via talent_splits" ON public.licensing_payouts;
CREATE POLICY "Talents can view their licensing payouts via talent_splits" ON public.licensing_payouts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM jsonb_array_elements(talent_splits) AS split
            WHERE (split->>'talent_id')::uuid IN (
                SELECT id FROM public.creators WHERE id = auth.uid()
            )
        )
        OR
        EXISTS (
            SELECT 1
            FROM public.creators c
            WHERE c.id = talent_id AND c.id = auth.uid()
        )
    );

-- ============================================
-- 6. Create trigger function for creator balance updates
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_licensing_payout_creator_update()
RETURNS TRIGGER AS $$
BEGIN
    -- For each talent in the talent_splits JSONB array, update their balance
    -- This handles the new multi-talent payout structure
    
    IF NEW.talent_splits IS NOT NULL AND jsonb_array_length(NEW.talent_splits) > 0 THEN
        -- Insert/update creator balance for each talent in talent_splits
        INSERT INTO public.creator_balances (creator_id, available_cents, currency, updated_at)
        SELECT 
            (split->>'talent_id')::uuid,
            (split->>'amount_cents')::bigint,
            NEW.currency,
            now()
        FROM jsonb_array_elements(NEW.talent_splits) AS split
        ON CONFLICT (creator_id) DO UPDATE
        SET available_cents = public.creator_balances.available_cents + EXCLUDED.available_cents,
            updated_at = now();
    END IF;
    
    -- Also handle the legacy single-talent case
    IF NEW.talent_id IS NOT NULL AND NEW.talent_earnings_cents > 0 THEN
        INSERT INTO public.creator_balances (creator_id, available_cents, currency, updated_at)
        VALUES (NEW.talent_id, NEW.talent_earnings_cents, NEW.currency, now())
        ON CONFLICT (creator_id) DO UPDATE
        SET available_cents = public.creator_balances.available_cents + EXCLUDED.available_cents,
            updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for creator balance updates on licensing_payouts insert
DROP TRIGGER IF EXISTS tr_update_creator_balance_on_payout ON public.licensing_payouts;
CREATE TRIGGER tr_update_creator_balance_on_payout
    AFTER INSERT ON public.licensing_payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_licensing_payout_creator_update();

-- ============================================
-- 7. Create trigger function for creator payout request status changes
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_creator_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract from balance when payout is approved
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR 
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved') THEN
        UPDATE public.creator_balances
        SET available_cents = available_cents - NEW.amount_cents,
            updated_at = now()
        WHERE creator_id = NEW.creator_id;
    END IF;

    -- Refund balance if payout fails or is cancelled after approval
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('failed', 'cancelled') 
        AND OLD.status IN ('approved', 'processing')) THEN
        UPDATE public.creator_balances
        SET available_cents = available_cents + NEW.amount_cents,
            updated_at = now()
        WHERE creator_id = NEW.creator_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for creator payout requests
DROP TRIGGER IF EXISTS tr_update_creator_balance_on_payout_request ON public.creator_payout_requests;
CREATE TRIGGER tr_update_creator_balance_on_payout_request
    AFTER INSERT OR UPDATE ON public.creator_payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_creator_payout_request_status_change();

-- ============================================
-- 8. Add updated_at trigger for agency_payment_links
-- ============================================

CREATE OR REPLACE FUNCTION public.update_agency_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_agency_payment_links_updated_at ON public.agency_payment_links;
CREATE TRIGGER tr_agency_payment_links_updated_at
    BEFORE UPDATE ON public.agency_payment_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_agency_payment_links_updated_at();

-- ============================================
-- 9. Add updated_at trigger for creator_balances
-- ============================================

CREATE OR REPLACE FUNCTION public.update_creator_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_creator_balances_updated_at ON public.creator_balances;
CREATE TRIGGER tr_creator_balances_updated_at
    BEFORE UPDATE ON public.creator_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_creator_balances_updated_at();

-- ============================================
-- 10. Add updated_at trigger for creator_payout_requests
-- ============================================

CREATE OR REPLACE FUNCTION public.update_creator_payout_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_creator_payout_requests_updated_at ON public.creator_payout_requests;
CREATE TRIGGER tr_creator_payout_requests_updated_at
    BEFORE UPDATE ON public.creator_payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_creator_payout_requests_updated_at();

-- ============================================
-- 11. Add comment documentation
-- ============================================

COMMENT ON TABLE public.agency_payment_links IS 'Stores Stripe payment links for licensing requests with talent pay splits';
COMMENT ON TABLE public.creator_balances IS 'Internal ledger for creator/talent earnings from licensing payouts';
COMMENT ON TABLE public.creator_payout_requests IS 'Payout requests from creators to withdraw their balance to Stripe Connect';

COMMENT ON COLUMN public.licensing_payouts.talent_splits IS 'JSON array of individual talent payouts: [{talent_id, amount_cents}, ...]';
COMMENT ON COLUMN public.licensing_payouts.talent_earnings_cents IS 'Total talent share from the payout';
COMMENT ON COLUMN public.licensing_payouts.payment_link_id IS 'Reference to agency_payment_links table';

COMMIT;
