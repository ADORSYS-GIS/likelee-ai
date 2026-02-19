-- Migration: Fix payout triggers to correctly increment available_cents
-- Previous versions in 0040 explicitly zeroed available_cents during INSERT/UPDATE,
-- assuming funds were already "away" in Stripe. 
-- However, we need to increment available_cents so the platform can track held funds
-- before they are transferred (or if a transfer fails). The backend will handle 
-- subtracting from available_cents upon successful Stripe transfer.

BEGIN;

-- 1. Fix handle_licensing_payout_creator_update (Creator Balances)
CREATE OR REPLACE FUNCTION public.handle_licensing_payout_creator_update()
RETURNS TRIGGER AS $$
BEGIN
    -- For each talent in the talent_splits JSONB array, update their creator balance.
    -- We increment BOTH earned_cents (lifetime) and available_cents (current held).
    IF NEW.talent_splits IS NOT NULL AND jsonb_array_length(NEW.talent_splits) > 0 THEN
        INSERT INTO public.creator_balances (creator_id, earned_cents, available_cents, currency, updated_at)
        SELECT
            (split->>'creator_id')::uuid,
            (split->>'amount_cents')::bigint, -- earned
            (split->>'amount_cents')::bigint, -- available
            COALESCE(NULLIF(NEW.currency, ''), 'USD'),
            now()
        FROM jsonb_array_elements(NEW.talent_splits) AS split
        WHERE (split->>'creator_id') IS NOT NULL
          AND (split->>'creator_id') <> ''
          AND (split->>'amount_cents')::bigint > 0
        ON CONFLICT (creator_id) DO UPDATE
        SET earned_cents = public.creator_balances.earned_cents + EXCLUDED.earned_cents,
            available_cents = public.creator_balances.available_cents + EXCLUDED.available_cents,
            updated_at = now();
    END IF;

    -- Legacy single-talent case
    IF NEW.talent_id IS NOT NULL AND NEW.talent_earnings_cents > 0 THEN
        INSERT INTO public.creator_balances (creator_id, earned_cents, available_cents, currency, updated_at)
        VALUES (
            NEW.talent_id, 
            NEW.talent_earnings_cents, 
            NEW.talent_earnings_cents, 
            COALESCE(NULLIF(NEW.currency, ''), 'USD'), 
            now()
        )
        ON CONFLICT (creator_id) DO UPDATE
        SET earned_cents = public.creator_balances.earned_cents + EXCLUDED.earned_cents,
            available_cents = public.creator_balances.available_cents + EXCLUDED.available_cents,
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix handle_licensing_payout_insert (Agency Balances)
CREATE OR REPLACE FUNCTION public.handle_licensing_payout_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- We increment BOTH earned_cents (lifetime) and available_cents (current held).
    INSERT INTO public.agency_balances (agency_id, earned_cents, available_cents, currency, updated_at)
    VALUES (
        NEW.agency_id, 
        NEW.amount_cents, 
        NEW.amount_cents, 
        NEW.currency, 
        now()
    )
    ON CONFLICT (agency_id) DO UPDATE
    SET earned_cents = public.agency_balances.earned_cents + EXCLUDED.earned_cents,
        available_cents = public.agency_balances.available_cents + EXCLUDED.available_cents,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper function to record Stripe transfer and decrement available balance atomically
CREATE OR REPLACE FUNCTION public.record_stripe_transfer(
    p_payment_link_id uuid,
    p_recipient_type text, -- 'agency' or 'creator'
    p_recipient_id uuid,
    p_source_agency_id uuid DEFAULT NULL,
    p_stripe_connect_account_id text,
    p_amount_cents bigint,
    p_currency text,
    p_stripe_transfer_id text,
    p_status text,
    p_failure_reason text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Record in transfers table
    INSERT INTO public.agency_payment_link_transfers (
        payment_link_id,
        recipient_type,
        recipient_id,
        stripe_connect_account_id,
        amount_cents,
        currency,
        stripe_transfer_id,
        status,
        failure_reason
    )
    VALUES (
        p_payment_link_id,
        p_recipient_type,
        p_recipient_id,
        p_stripe_connect_account_id,
        p_amount_cents,
        p_currency,
        p_stripe_transfer_id,
        p_status,
        p_failure_reason
    );

    -- If successful, decrement available balance
    IF p_status = 'created' AND p_stripe_transfer_id IS NOT NULL THEN
        IF p_recipient_type = 'agency' THEN
            UPDATE public.agency_balances
            SET available_cents = available_cents - p_amount_cents,
                updated_at = now()
            WHERE agency_id = p_recipient_id;
        ELSIF p_recipient_type = 'creator' THEN
            UPDATE public.creator_balances
            SET available_cents = available_cents - p_amount_cents,
                updated_at = now()
            WHERE creator_id = p_recipient_id;

            -- Also decrement the agency source balance when the creator transfer is paid out of agency funds.
            IF p_source_agency_id IS NOT NULL THEN
                UPDATE public.agency_balances
                SET available_cents = available_cents - p_amount_cents,
                    updated_at = now()
                WHERE agency_id = p_source_agency_id;
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
