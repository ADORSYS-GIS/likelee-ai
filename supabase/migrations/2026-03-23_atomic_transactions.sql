-- Migration: Atomic Transaction RPC Functions
-- Issue #349: Refactor Database Operations to Use Atomic Transactions
-- 
-- This migration creates PostgreSQL RPC functions that wrap multi-step
-- operations in explicit transactions, ensuring atomicity (all-or-nothing)
-- for critical business operations.

BEGIN;

-- =====================================================================
-- STUDIO WALLET TRANSACTIONAL FUNCTIONS
-- =====================================================================
-- These functions ensure that wallet balance updates and transaction
-- records are created atomically. If either operation fails, both
-- are rolled back.

--- Adjusts wallet balance and records the transaction in a single atomic operation.
-- Returns: JSON with wallet_id, balance_before, balance_after, transaction_id
CREATE OR REPLACE FUNCTION public.adjust_wallet_credits(
    p_user_id uuid,
    p_delta bigint,                    -- positive for credit, negative for debit
    p_reason text,
    p_provider text DEFAULT NULL,
    p_generation_id uuid DEFAULT NULL,
    p_stripe_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_transaction_id uuid;
BEGIN
    -- Get or create wallet atomically
    INSERT INTO public.studio_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO v_wallet_id;
    
    -- If wallet already exists, fetch it with lock
    IF v_wallet_id IS NULL THEN
        SELECT id, balance INTO v_wallet_id, v_balance_before
        FROM public.studio_wallets
        WHERE user_id = p_user_id
        FOR UPDATE;  -- Lock row for transaction
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Wallet not found and could not be created for user %', p_user_id;
        END IF;
    ELSE
        -- Newly created wallet: lock it for consistency with concurrent operations
        SELECT balance INTO v_balance_before
        FROM public.studio_wallets
        WHERE id = v_wallet_id
        FOR UPDATE;
        
        v_balance_before := COALESCE(v_balance_before, 0);
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + p_delta;
    
    -- Validate balance doesn't go negative for deductions
    IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient credits: have %, need %', v_balance_before, ABS(p_delta);
    END IF;
    
    -- Update wallet balance
    UPDATE public.studio_wallets
    SET balance = v_balance_after,
        updated_at = now()
    WHERE id = v_wallet_id;
    
    -- Record the transaction
    INSERT INTO public.studio_credit_transactions (
        wallet_id,
        delta,
        balance_after,
        reason,
        provider,
        generation_id,
        stripe_session_id
    )
    VALUES (
        v_wallet_id,
        p_delta,
        v_balance_after,
        p_reason,
        p_provider,
        p_generation_id,
        p_stripe_session_id
    )
    RETURNING id INTO v_transaction_id;
    
    -- Return result as JSON
    RETURN jsonb_build_object(
        'wallet_id', v_wallet_id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'transaction_id', v_transaction_id,
        'success', true
    );
END;
$$;

COMMENT ON FUNCTION public.adjust_wallet_credits IS 
'Atomically adjusts wallet balance and records the transaction. 
Use positive delta for credits, negative for debits. 
Raises exception if insufficient balance for debit.';

-- =====================================================================
-- PAYMENT LINK COMPLETION TRANSACTIONAL FUNCTION
-- =====================================================================
-- Handles the complete payment link checkout flow atomically:
-- 1. Updates payment link status
-- 2. Inserts licensing_payouts record
-- 3. Updates payments status
-- 4. Archives related license_submissions and licensing_requests

CREATE OR REPLACE FUNCTION public.complete_payment_link_checkout(
    p_payment_link_id uuid,
    p_payment_intent_id text,
    p_agency_id uuid,
    p_licensing_request_ids text,     -- comma-separated UUIDs
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
BEGIN
    -- Parse and validate licensing request IDs
    v_lr_ids := string_to_array(p_licensing_request_ids, ',');
    
    -- Trim whitespace from each element
    FOR i IN 1..array_length(v_lr_ids, 1) LOOP
        v_lr_ids[i] := trim(v_lr_ids[i]);
    END LOOP;
    
    -- Remove empty elements
    v_lr_ids := array_remove(v_lr_ids, '');
    
    -- Validate we have at least one ID
    IF v_lr_ids IS NULL OR array_length(v_lr_ids, 1) IS NULL OR array_length(v_lr_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No valid licensing request IDs provided';
    END IF;
    
    v_first_lr_id := v_lr_ids[1];
    
    -- 1. Update payment link status
    UPDATE public.agency_payment_links
    SET status = 'paid',
        paid_at = now(),
        stripe_payment_intent_id = p_payment_intent_id,
        updated_at = now()
    WHERE id = p_payment_link_id
      AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment link % not found or not in active status', p_payment_link_id;
    END IF;
    
    -- 2. Insert licensing_payouts record (triggers balance updates via existing trigger)
    INSERT INTO public.licensing_payouts (
        licensing_request_id,
        agency_id,
        amount_cents,
        talent_earnings_cents,
        talent_splits,
        platform_fee_cents,
        net_amount_cents,
        currency,
        payment_link_id,
        stripe_payment_intent_id,
        commission_rate,
        paid_at
    )
    VALUES (
        v_first_lr_id::uuid,
        p_agency_id,
        p_agency_amount_cents,
        p_talent_amount_cents,
        p_talent_splits,
        p_platform_fee_cents,
        p_net_amount_cents,
        p_currency,
        p_payment_link_id,
        p_payment_intent_id,
        p_commission_rate,
        now()
    )
    RETURNING id INTO v_payout_id;
    
    -- 3. Update payments status for all licensing requests
    FOREACH v_lr_id IN ARRAY v_lr_ids
    LOOP
        UPDATE public.payments
        SET status = 'paid',
            paid_at = now(),
            stripe_payment_intent_id = p_payment_intent_id
        WHERE licensing_request_id = v_lr_id::uuid
          AND status IS DISTINCT FROM 'paid';
        
        GET DIAGNOSTICS v_updated_payments = ROW_COUNT;
        v_updated_payments := v_updated_payments + ROW_COUNT;
    END LOOP;
    
    -- 4. Archive license_submissions and licensing_requests (best-effort within transaction)
    FOREACH v_lr_id IN ARRAY v_lr_ids
    LOOP
        -- Get submission_id for this licensing request
        SELECT submission_id INTO v_submission_id
        FROM public.licensing_requests
        WHERE id = v_lr_id::uuid;
        
        -- Archive the license_submission if exists
        IF v_submission_id IS NOT NULL THEN
            UPDATE public.license_submissions
            SET status = 'archived',
                archived_at = now()
            WHERE id = v_submission_id
              AND status IS DISTINCT FROM 'archived';
            
            IF FOUND THEN
                v_archived_submissions := v_archived_submissions + 1;
            END IF;
        END IF;
        
        -- Archive the licensing_request
        UPDATE public.licensing_requests
        SET status = 'archived',
            archived_at = now()
        WHERE id = v_lr_id::uuid
          AND status IS DISTINCT FROM 'archived';
        
        IF FOUND THEN
            v_archived_requests := v_archived_requests + 1;
        END IF;
    END LOOP;
    
    -- Return summary
    RETURN jsonb_build_object(
        'payment_link_id', p_payment_link_id,
        'payout_id', v_payout_id,
        'updated_payments', v_updated_payments,
        'archived_submissions', v_archived_submissions,
        'archived_requests', v_archived_requests,
        'success', true
    );
END;
$$;

COMMENT ON FUNCTION public.complete_payment_link_checkout IS
'Atomically completes a payment link checkout: updates payment link status,
inserts licensing_payouts, updates payments, and archives related records.
All operations succeed or all roll back.';

-- =====================================================================
-- AGENCY STRIPE CONNECT SETUP TRANSACTIONAL FUNCTION
-- =====================================================================
-- Creates/updates agency profile and Stripe Connect account atomically

CREATE OR REPLACE FUNCTION public.setup_agency_stripe_connect(
    p_agency_id uuid,
    p_email text,
    p_stripe_account_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_account_id text;
    v_is_new boolean := false;
BEGIN
    -- Check if agency exists
    SELECT stripe_connect_account_id INTO v_existing_account_id
    FROM public.agencies
    WHERE id = p_agency_id;
    
    IF NOT FOUND THEN
        -- Create minimal agency profile
        INSERT INTO public.agencies (
            id,
            agency_name,
            email,
            status,
            onboarding_step
        )
        VALUES (
            p_agency_id,
            'Agency',
            p_email,
            'active',
            'complete'
        );
        
        v_is_new := true;
    END IF;
    
    -- Update Stripe Connect account ID if provided
    IF p_stripe_account_id IS NOT NULL THEN
        UPDATE public.agencies
        SET stripe_connect_account_id = p_stripe_account_id
        WHERE id = p_agency_id;
    END IF;
    
    -- Return result
    RETURN jsonb_build_object(
        'agency_id', p_agency_id,
        'stripe_connect_account_id', COALESCE(p_stripe_account_id, v_existing_account_id),
        'is_new_agency', v_is_new,
        'success', true
    );
END;
$$;

COMMENT ON FUNCTION public.setup_agency_stripe_connect IS
'Atomically creates agency profile (if needed) and sets Stripe Connect account ID.';

-- =====================================================================
-- STRIPE TRANSFERS TABLE (if not exists)
-- =====================================================================
-- Note: The record_stripe_transfer function already exists in migration 0044_fix_payout_triggers_available_cents.sql
-- This table is created here for reference if needed by the existing function.

-- Create agency_payment_link_transfers table if it doesn't exist (referenced by existing record_stripe_transfer)
CREATE TABLE IF NOT EXISTS public.agency_payment_link_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_link_id uuid REFERENCES public.agency_payment_links(id) ON DELETE CASCADE,
    recipient_type text NOT NULL CHECK (recipient_type IN ('agency', 'creator')),
    recipient_id uuid NOT NULL,
    stripe_connect_account_id text NOT NULL,
    amount_cents bigint NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    stripe_transfer_id text UNIQUE,
    status text NOT NULL DEFAULT 'pending',
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_payment_link_transfers_payment_link_id ON public.agency_payment_link_transfers(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_link_transfers_recipient_id ON public.agency_payment_link_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_agency_payment_link_transfers_stripe_transfer_id ON public.agency_payment_link_transfers(stripe_transfer_id);

-- Enable RLS
ALTER TABLE public.agency_payment_link_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their transfers" ON public.agency_payment_link_transfers;
CREATE POLICY "Agencies can view their transfers" ON public.agency_payment_link_transfers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_payment_links
            WHERE agency_payment_links.id = agency_payment_link_transfers.payment_link_id
              AND agency_payment_links.agency_id = auth.uid()
        )
    );

COMMENT ON TABLE public.agency_payment_link_transfers IS 'Records Stripe Connect transfers for payment links (used by existing record_stripe_transfer function)';

-- =====================================================================
-- BULK UPDATE PAYMENTS TRANSACTIONAL FUNCTION
-- =====================================================================
-- Updates multiple payments in a single transaction

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
AS $$
DECLARE
    v_updated_count bigint;
BEGIN
    -- Validate status
    IF p_status NOT IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'paid') THEN
        RAISE EXCEPTION 'Invalid payment status: %', p_status;
    END IF;
    
    -- Bulk update payments
    UPDATE public.payments
    SET status = p_status,
        paid_at = COALESCE(p_paid_at, CASE WHEN p_status IN ('succeeded', 'paid') THEN now() ELSE paid_at END),
        stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
        gross_cents = COALESCE(p_gross_cents, gross_cents),
        agency_earnings_cents = COALESCE(p_agency_earnings_cents, agency_earnings_cents),
        talent_earnings_cents = COALESCE(p_talent_earnings_cents, talent_earnings_cents),
        commission_rate = COALESCE(p_commission_rate, commission_rate),
        currency_code = COALESCE(p_currency_code, currency_code)
    WHERE id = ANY(p_payment_ids);
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'updated_count', v_updated_count,
        'status', p_status,
        'success', true
    );
END;
$$;

COMMENT ON FUNCTION public.bulk_update_payments_status IS
'Atomically updates multiple payments to the same status with optional fields.';

COMMIT;
