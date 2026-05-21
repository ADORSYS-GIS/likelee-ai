-- 011_payments.sql
-- Consolidated migration for payments domain
-- Source files: 0003_assets_storage_moderation.sql (payments first def),
-- 0014_license_templates.sql, 0022_licensing_payouts.sql, 0035_licensing_package_paywall.sql,
-- 0036_agency_balances_and_payouts.sql, 0036_commission_management.sql,
-- 0038_agency_payment_links_and_creator_balances.sql, 0039_platform_fee_on_licensing.sql,
-- 0040_instant_connect_distribution.sql, 0040_agency_embedded_signing.sql,
-- 0041_fix_creator_balance_trigger_use_creator_id.sql, 0042_performance_tier_payout_percent.sql,
-- 0044_agency_payout_requests.sql, 0044_fix_payout_triggers_available_cents.sql,
-- 2026-02-18_payments_commission_columns.sql, 2026-03-23_atomic_transactions.sql,
-- 2026-05-05_add_stripe_payment_intent_id_to_payments.sql

BEGIN;

-- ============================================================================
-- 1. PAYMENTS TABLE (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    
    -- Subject (talent, creator, or both)
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    
    -- Campaign/Request Link
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
    
    -- Stripe
    booking_id text,
    stripe_payment_intent_id text,
    
    -- Status
    status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed')) DEFAULT 'pending',
    
    -- Amounts
    currency_code text NOT NULL DEFAULT 'USD',
    gross_cents integer NOT NULL DEFAULT 0 CHECK (gross_cents >= 0),
    
    -- Split (computed)
    talent_earnings_cents integer NOT NULL DEFAULT 0 CHECK (talent_earnings_cents >= 0),
    agency_earnings_cents integer NOT NULL DEFAULT 0 CHECK (agency_earnings_cents >= 0),
    
    -- Commission
    commission_bps integer DEFAULT 2000,
    commission_cents bigint DEFAULT 0,
    platform_fee_cents integer DEFAULT 0,
    
    -- Timing
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_agency ON public.payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_payments_brand ON public.payments(brand_id);
CREATE INDEX IF NOT EXISTS idx_payments_talent ON public.payments(talent_id);
CREATE INDEX IF NOT EXISTS idx_payments_creator ON public.payments(creator_id);
CREATE INDEX IF NOT EXISTS idx_payments_campaign ON public.payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_payments_licensing_request ON public.payments(licensing_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_agency_talent_status_paid ON public.payments(agency_id, talent_id, status, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency users can view their agency's payments" ON public.payments;
CREATE POLICY "Agency users can view their agency's payments" 
    ON public.payments FOR SELECT USING (auth.uid() = agency_id);

-- ============================================================================
-- 2. AGENCY PAYMENT LINKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_payment_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Link Details
    name text,
    description text,
    
    -- Amount
    amount_cents integer DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    
    -- Platform fee
    platform_fee_bps integer DEFAULT 0,
    platform_fee_cents integer DEFAULT 0,
    
    -- Stripe
    stripe_price_id text,
    stripe_product_id text,
    stripe_payment_link_id text,
    stripe_payment_link_url text,
    
    -- Licensing Request
    licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
    
    -- Campaign
    campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
    
    -- Amount breakdown
    total_amount_cents bigint,
    net_amount_cents bigint,
    agency_amount_cents bigint,
    talent_amount_cents bigint,
    agency_percent numeric(5,2),
    talent_percent numeric(5,2),
    
    -- Talent splits
    talent_splits jsonb DEFAULT '[]'::jsonb,
    
    -- Client info
    client_email text,
    client_name text,
    
    -- Status
    status text DEFAULT 'active',
    is_active boolean DEFAULT true,
    usage_limit integer,
    usage_count integer DEFAULT 0,
    
    -- Expiration
    expires_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_payment_links_agency ON public.agency_payment_links(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_active ON public.agency_payment_links(agency_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_stripe ON public.agency_payment_links(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_licensing_request ON public.agency_payment_links(licensing_request_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_campaign ON public.agency_payment_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_stripe_payment_link_id ON public.agency_payment_links(stripe_payment_link_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_status ON public.agency_payment_links(status);
CREATE INDEX IF NOT EXISTS idx_agency_payment_links_client_email ON public.agency_payment_links(client_email);

ALTER TABLE public.agency_payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own payment links" ON public.agency_payment_links;
CREATE POLICY "Agencies can view own payment links" ON public.agency_payment_links
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own payment links" ON public.agency_payment_links;
CREATE POLICY "Agencies can manage own payment links" ON public.agency_payment_links
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 3. AGENCY PAYMENT LINK TRANSFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_payment_link_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    payment_link_id uuid REFERENCES public.agency_payment_links(id) ON DELETE SET NULL,
    
    -- Transfer Details
    stripe_transfer_id text NOT NULL UNIQUE,
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    
    -- Status
    status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'processing', 'completed', 'failed')),
    failure_reason text,
    
    -- Stripe Connect
    stripe_connect_account_id text NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_payment_link_transfers_agency ON public.agency_payment_link_transfers(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_link_transfers_link ON public.agency_payment_link_transfers(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_link_transfers_stripe ON public.agency_payment_link_transfers(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_link_transfers_status ON public.agency_payment_link_transfers(status);

ALTER TABLE public.agency_payment_link_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own payment link transfers" ON public.agency_payment_link_transfers;
CREATE POLICY "Agencies can view own payment link transfers" ON public.agency_payment_link_transfers
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 4. AGENCY BALANCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_balances (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Balance
    available_cents bigint NOT NULL DEFAULT 0,
    pending_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_balances_currency ON public.agency_balances(currency);

ALTER TABLE public.agency_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own balance" ON public.agency_balances;
CREATE POLICY "Agencies can view own balance" ON public.agency_balances
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 5. AGENCY PAYOUT REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_payout_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Amount
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    payout_method text DEFAULT 'instant',
    
    -- Stripe Connect
    stripe_connect_account_id text,
    stripe_payout_id text,
    stripe_transfer_id text,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed')),
    failure_reason text,
    
    -- Timing
    requested_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    completed_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_agency ON public.agency_payout_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_status ON public.agency_payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_requested ON public.agency_payout_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_stripe ON public.agency_payout_requests(stripe_payout_id);

ALTER TABLE public.agency_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own payout requests" ON public.agency_payout_requests;
CREATE POLICY "Agencies can view own payout requests" ON public.agency_payout_requests
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 6. CREATOR BALANCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creator_balances (
    creator_id uuid PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Balance
    available_cents bigint NOT NULL DEFAULT 0,
    pending_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    
    -- Stripe Connect (for instant payouts)
    stripe_connect_account_id text,
    
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_balances_currency ON public.creator_balances(currency);

ALTER TABLE public.creator_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own balance" ON public.creator_balances;
CREATE POLICY "Creators can view own balance" ON public.creator_balances
    FOR SELECT USING (creator_id = auth.uid());

-- ============================================================================
-- 7. CREATOR PAYOUT REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creator_payout_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Amount
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    payout_method text DEFAULT 'instant',
    
    -- Stripe Connect
    stripe_connect_account_id text,
    stripe_payout_id text,
    stripe_transfer_id text,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed')),
    failure_reason text,
    
    -- Timing
    requested_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    completed_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_creator ON public.creator_payout_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_status ON public.creator_payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_creator_payout_requests_requested ON public.creator_payout_requests(requested_at DESC);

ALTER TABLE public.creator_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own payout requests" ON public.creator_payout_requests;
CREATE POLICY "Creators can view own payout requests" ON public.creator_payout_requests
    FOR SELECT USING (creator_id = auth.uid());

-- ============================================================================
-- 8. TALENT COMMISSIONS (legacy - being phased out for agency_creator_commissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    commission_rate numeric(10, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
    
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (agency_id, talent_id)
);

CREATE INDEX IF NOT EXISTS idx_talent_commissions_agency_talent ON public.talent_commissions(agency_id, talent_id);

ALTER TABLE public.talent_commissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. AGENCY-CREATOR COMMISSIONS (modern replacement)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_creator_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    commission_rate numeric(10, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
    
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_agency_creator_commissions UNIQUE (agency_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_creator_commissions_agency_creator ON public.agency_creator_commissions(agency_id, creator_id);

ALTER TABLE public.agency_creator_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can view creator commissions" ON public.agency_creator_commissions
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can insert creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can insert creator commissions" ON public.agency_creator_commissions
    FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can update creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can update creator commissions" ON public.agency_creator_commissions
    FOR UPDATE USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can delete creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can delete creator commissions" ON public.agency_creator_commissions
    FOR DELETE USING (agency_id = auth.uid());

-- ============================================================================
-- 10. AGENCY-CREATOR COMMISSION HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_creator_commission_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    action text NOT NULL DEFAULT 'set' CHECK (action IN ('set', 'reset')),
    commission_rate numeric(10, 2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
    
    changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_creator_commission_history_agency_changed ON public.agency_creator_commission_history(agency_id, changed_at DESC);

ALTER TABLE public.agency_creator_commission_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view creator commission history" ON public.agency_creator_commission_history;
CREATE POLICY "Agencies can view creator commission history" ON public.agency_creator_commission_history
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 11. TALENT IRL PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_irl_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    -- Payment Details
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    
    -- Description
    description text,
    payment_type text NOT NULL DEFAULT 'booking', -- 'booking', 'bonus', 'expense_reimbursement'
    
    -- Related booking
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Stripe
    stripe_transfer_id text,
    
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_irl_payments_agency ON public.talent_irl_payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payments_talent ON public.talent_irl_payments(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payments_status ON public.talent_irl_payments(status);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payments_booking ON public.talent_irl_payments(booking_id);

ALTER TABLE public.talent_irl_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 12. TALENT IRL PAYOUT REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_irl_payout_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    
    -- Amount
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
    
    -- Review
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_notes text,
    
    -- Payout
    stripe_transfer_id text,
    paid_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_irl_payout_requests_agency ON public.talent_irl_payout_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payout_requests_talent ON public.talent_irl_payout_requests(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_irl_payout_requests_status ON public.talent_irl_payout_requests(status);

ALTER TABLE public.talent_irl_payout_requests ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 13. TRIGGER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_licensing_payout_creator_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.talent_splits IS NOT NULL AND jsonb_array_length(NEW.talent_splits) > 0 THEN
        INSERT INTO public.creator_balances (creator_id, available_cents, currency, updated_at)
        SELECT
            (split->>'creator_id')::uuid,
            (split->>'amount_cents')::bigint,
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            now()
        FROM jsonb_array_elements(NEW.talent_splits) AS split
        WHERE (split->>'creator_id') IS NOT NULL
          AND (split->>'creator_id') <> ''
          AND (split->>'amount_cents')::bigint > 0
        ON CONFLICT (creator_id) DO UPDATE
        SET available_cents = public.creator_balances.available_cents + EXCLUDED.available_cents,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_licensing_payout_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.agency_balances (agency_id, available_cents, currency, updated_at)
    VALUES (
        NEW.agency_id,
        NEW.amount_cents,
        NEW.currency,
        now()
    )
    ON CONFLICT (agency_id) DO UPDATE
    SET available_cents = public.agency_balances.available_cents + EXCLUDED.available_cents,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_creator_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved') THEN
        UPDATE public.creator_balances
        SET available_cents = available_cents - NEW.amount_cents,
            updated_at = now()
        WHERE creator_id = NEW.creator_id;
    END IF;
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

CREATE OR REPLACE FUNCTION public.record_stripe_transfer(
    p_payment_link_id uuid,
    p_recipient_type text,
    p_recipient_id uuid,
    p_stripe_connect_account_id text,
    p_amount_cents bigint,
    p_currency text,
    p_stripe_transfer_id text,
    p_status text,
    p_source_agency_id uuid DEFAULT NULL,
    p_failure_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.agency_payment_link_transfers (
        payment_link_id, recipient_type, recipient_id,
        stripe_connect_account_id, amount_cents, currency,
        stripe_transfer_id, status, failure_reason
    ) VALUES (
        p_payment_link_id, p_recipient_type, p_recipient_id,
        p_stripe_connect_account_id, p_amount_cents, p_currency,
        p_stripe_transfer_id, p_status, p_failure_reason
    );
    IF p_status = 'created' AND p_stripe_transfer_id IS NOT NULL THEN
        IF p_recipient_type = 'agency' THEN
            UPDATE public.agency_balances
            SET available_cents = available_cents - p_amount_cents, updated_at = now()
            WHERE agency_id = p_recipient_id;
        ELSIF p_recipient_type = 'creator' THEN
            UPDATE public.creator_balances
            SET available_cents = available_cents - p_amount_cents, updated_at = now()
            WHERE creator_id = p_recipient_id;
            IF p_source_agency_id IS NOT NULL THEN
                UPDATE public.agency_balances
                SET available_cents = available_cents - p_amount_cents, updated_at = now()
                WHERE agency_id = p_source_agency_id;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.complete_payment_link_checkout(
    p_payment_link_id uuid,
    p_payment_intent_id text,
    p_agency_id uuid,
    p_licensing_request_ids text,
    p_agency_amount_cents bigint,
    p_talent_amount_cents bigint,
    p_platform_fee_cents bigint,
    p_net_amount_cents bigint,
    p_currency text,
    p_talent_splits jsonb,
    p_commission_rate numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lr_id text;
    v_lr_ids text[];
    v_first_lr_id text;
    i integer;
    v_payout_id uuid;
    v_updated_payments bigint := 0;
    v_archived_submissions bigint := 0;
    v_archived_requests bigint := 0;
    v_submission_id uuid;
    v_current_row_count bigint;
BEGIN
    v_lr_ids := string_to_array(p_licensing_request_ids, ',');
    FOR i IN 1..array_length(v_lr_ids, 1) LOOP
        v_lr_ids[i] := trim(v_lr_ids[i]);
    END LOOP;
    v_lr_ids := array_remove(v_lr_ids, '');
    IF v_lr_ids IS NULL OR array_length(v_lr_ids, 1) IS NULL OR array_length(v_lr_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No valid licensing request IDs provided';
    END IF;
    v_first_lr_id := v_lr_ids[1];
    UPDATE public.agency_payment_links
    SET status = 'paid', paid_at = now(), stripe_payment_intent_id = p_payment_intent_id, updated_at = now()
    WHERE id = p_payment_link_id AND status = 'active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment link % not found or not in active status', p_payment_link_id;
    END IF;
    INSERT INTO public.licensing_payouts (
        agency_id, amount_cents, platform_fee_cents, currency,
        payment_link_id, status, paid_at
    ) VALUES (
        p_agency_id, p_agency_amount_cents, p_platform_fee_cents, p_currency,
        p_payment_link_id, 'paid', now()
    ) RETURNING id INTO v_payout_id;
    FOREACH v_lr_id IN ARRAY v_lr_ids LOOP
        UPDATE public.payments
        SET status = 'succeeded', paid_at = now(), stripe_payment_intent_id = p_payment_intent_id
        WHERE licensing_request_id = v_lr_id::uuid AND status IS DISTINCT FROM 'succeeded';
        GET DIAGNOSTICS v_current_row_count = ROW_COUNT;
        v_updated_payments := v_updated_payments + v_current_row_count;
    END LOOP;
    FOREACH v_lr_id IN ARRAY v_lr_ids LOOP
        SELECT licensing_request_id INTO v_submission_id FROM public.license_submissions WHERE licensing_request_id = v_lr_id::uuid LIMIT 1;
        IF v_submission_id IS NOT NULL THEN
            UPDATE public.license_submissions SET status = 'archived', archived_at = now() WHERE id = v_submission_id AND status IS DISTINCT FROM 'archived';
            IF FOUND THEN v_archived_submissions := v_archived_submissions + 1; END IF;
        END IF;
        UPDATE public.licensing_requests SET status = 'archived', archived_at = now() WHERE id = v_lr_id::uuid AND status IS DISTINCT FROM 'archived';
        IF FOUND THEN v_archived_requests := v_archived_requests + 1; END IF;
    END LOOP;
    RETURN jsonb_build_object(
        'payment_link_id', p_payment_link_id, 'payout_id', v_payout_id,
        'updated_payments', v_updated_payments, 'archived_submissions', v_archived_submissions,
        'archived_requests', v_archived_requests, 'success', true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_update_payments_status(
    p_payment_ids uuid[],
    p_status text,
    p_paid_at timestamptz DEFAULT NULL,
    p_stripe_payment_intent_id text DEFAULT NULL,
    p_gross_cents bigint DEFAULT NULL,
    p_agency_earnings_cents bigint DEFAULT NULL,
    p_talent_earnings_cents bigint DEFAULT NULL,
    p_commission_rate numeric DEFAULT NULL,
    p_currency_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated_count bigint;
BEGIN
    IF p_status NOT IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'paid') THEN
        RAISE EXCEPTION 'Invalid payment status: %', p_status;
    END IF;
    UPDATE public.payments
    SET status = p_status,
        paid_at = COALESCE(p_paid_at, CASE WHEN p_status IN ('succeeded', 'paid') THEN now() ELSE paid_at END),
        stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
        gross_cents = COALESCE(p_gross_cents, gross_cents),
        agency_earnings_cents = COALESCE(p_agency_earnings_cents, agency_earnings_cents),
        talent_earnings_cents = COALESCE(p_talent_earnings_cents, talent_earnings_cents),
        commission_bps = COALESCE(p_commission_rate, commission_bps),
        currency_code = COALESCE(p_currency_code, currency_code)
    WHERE id = ANY(p_payment_ids);
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN jsonb_build_object('updated_count', v_updated_count, 'status', p_status, 'success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_campaign_offer_transfer(
  p_offer_id                  uuid,
  p_recipient_type            text,
  p_recipient_id              uuid,
  p_stripe_connect_account_id text,
  p_amount_cents              bigint,
  p_currency                  text,
  p_stripe_transfer_id        text    DEFAULT NULL,
  p_status                    text    DEFAULT 'created',
  p_failure_reason            text    DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_prev_status     text;
  v_resolved_status text;
BEGIN
  v_resolved_status := COALESCE(NULLIF(p_status, ''), 'created');
  SELECT status INTO v_prev_status
  FROM public.campaign_offer_transfers
  WHERE offer_id = p_offer_id AND recipient_type = p_recipient_type AND recipient_id = p_recipient_id;
  INSERT INTO public.campaign_offer_transfers (
    offer_id, recipient_type, recipient_id, stripe_connect_account_id,
    amount_cents, currency, stripe_transfer_id, status, failure_reason, updated_at
  ) VALUES (
    p_offer_id, p_recipient_type, p_recipient_id, p_stripe_connect_account_id,
    p_amount_cents, COALESCE(NULLIF(p_currency, ''), 'USD'),
    p_stripe_transfer_id, v_resolved_status, p_failure_reason, now()
  )
  ON CONFLICT (offer_id, recipient_type, recipient_id)
  DO UPDATE SET
    stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
    amount_cents = EXCLUDED.amount_cents, currency = EXCLUDED.currency,
    stripe_transfer_id = COALESCE(EXCLUDED.stripe_transfer_id, public.campaign_offer_transfers.stripe_transfer_id),
    status = EXCLUDED.status, failure_reason = EXCLUDED.failure_reason, updated_at = now();
  IF v_resolved_status = 'created' AND p_stripe_transfer_id IS NOT NULL
     AND (v_prev_status IS NULL OR v_prev_status <> 'created')
  THEN
    IF p_recipient_type = 'agency' THEN
      UPDATE public.agency_balances SET available_cents = GREATEST(0, available_cents - p_amount_cents), updated_at = now()
      WHERE agency_id = p_recipient_id;
    ELSIF p_recipient_type = 'creator' THEN
      UPDATE public.creator_balances SET available_cents = GREATEST(0, available_cents - p_amount_cents), updated_at = now()
      WHERE creator_id = p_recipient_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. PAYMENT BALANCE TRIGGERS (from 0036, 0038, 0044)
-- ============================================================================

-- Agency balance: update on licensing_payouts insert
DROP TRIGGER IF EXISTS tr_update_agency_balance_on_payout ON public.licensing_payouts;
CREATE TRIGGER tr_update_agency_balance_on_payout
    AFTER INSERT ON public.licensing_payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_licensing_payout_insert();

-- Agency balance: update on payout request status change
DROP TRIGGER IF EXISTS tr_update_agency_balance_on_payout_request ON public.agency_payout_requests;
CREATE TRIGGER tr_update_agency_balance_on_payout_request
    AFTER INSERT OR UPDATE ON public.agency_payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payout_request_status_change();

-- Creator balance: update on licensing_payouts insert
DROP TRIGGER IF EXISTS tr_update_creator_balance_on_payout ON public.licensing_payouts;
CREATE TRIGGER tr_update_creator_balance_on_payout
    AFTER INSERT ON public.licensing_payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_licensing_payout_creator_update();

-- Creator balance: update on creator payout request status change
DROP TRIGGER IF EXISTS tr_update_creator_balance_on_payout_request ON public.creator_payout_requests;
CREATE TRIGGER tr_update_creator_balance_on_payout_request
    AFTER INSERT OR UPDATE ON public.creator_payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_creator_payout_request_status_change();

-- ============================================================================
-- 11. TIMESTAMP UPDATED_AT TRIGGERS (from 0038)
-- ============================================================================

DROP TRIGGER IF EXISTS tr_agency_payment_links_updated_at ON public.agency_payment_links;
CREATE TRIGGER tr_agency_payment_links_updated_at
    BEFORE UPDATE ON public.agency_payment_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_creator_balances_updated_at ON public.creator_balances;
CREATE TRIGGER tr_creator_balances_updated_at
    BEFORE UPDATE ON public.creator_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_creator_payout_requests_updated_at ON public.creator_payout_requests;
CREATE TRIGGER tr_creator_payout_requests_updated_at
    BEFORE UPDATE ON public.creator_payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
