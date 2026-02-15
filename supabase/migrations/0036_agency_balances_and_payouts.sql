-- Create agency_balances table
CREATE TABLE IF NOT EXISTS public.agency_balances (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    available_cents bigint NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Agencies can view their own balance" ON public.agency_balances;
CREATE POLICY "Agencies can view their own balance" ON public.agency_balances
    FOR SELECT USING (agency_id = auth.uid());

-- Function to update agency balance from licensing_payouts
CREATE OR REPLACE FUNCTION public.handle_licensing_payout_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.agency_balances (agency_id, available_cents, currency, updated_at)
    VALUES (NEW.agency_id, NEW.amount_cents, NEW.currency, now())
    ON CONFLICT (agency_id) DO UPDATE
    SET available_cents = public.agency_balances.available_cents + EXCLUDED.available_cents,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for licensing_payouts
DROP TRIGGER IF EXISTS tr_update_agency_balance_on_payout ON public.licensing_payouts;
CREATE TRIGGER tr_update_agency_balance_on_payout
    AFTER INSERT ON public.licensing_payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_licensing_payout_insert();

-- Function to handle payout requests (subtracting from balance)
CREATE OR REPLACE FUNCTION public.handle_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If a payout request is marked as paid or processing, we should have already validated the balance.
    -- However, for the ledger consistency, we only subtract when it's finalized/approved.
    -- Assuming auto-approval for now.
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
        UPDATE public.agency_balances
        SET available_cents = available_cents - NEW.amount_cents,
            updated_at = now()
        WHERE agency_id = NEW.agency_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create agency_payout_requests table for agency-specific payouts
CREATE TABLE IF NOT EXISTS public.agency_payout_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    currency text NOT NULL DEFAULT 'USD',
    payout_method text NOT NULL DEFAULT 'standard' CHECK (payout_method IN ('standard', 'instant')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'failed')),
    stripe_transfer_id text,
    stripe_payout_id text,
    failure_reason text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for agency_payout_requests
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_agency_id ON public.agency_payout_requests (agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_status ON public.agency_payout_requests (status);
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_requested_at ON public.agency_payout_requests (requested_at DESC);

-- Enable RLS
ALTER TABLE public.agency_payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agency_payout_requests
DROP POLICY IF EXISTS "Agencies can view their payout requests" ON public.agency_payout_requests;
CREATE POLICY "Agencies can view their payout requests" ON public.agency_payout_requests
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create payout requests" ON public.agency_payout_requests;
CREATE POLICY "Agencies can create payout requests" ON public.agency_payout_requests
    FOR INSERT WITH CHECK (agency_id = auth.uid());

-- Trigger for agency_payout_requests to subtract from balance on approval
DROP TRIGGER IF EXISTS tr_update_agency_balance_on_payout_request ON public.agency_payout_requests;
CREATE TRIGGER tr_update_agency_balance_on_payout_request
    AFTER INSERT OR UPDATE ON public.agency_payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payout_request_status_change();

-- Function to initialize agency_balances for existing agencies (optional, run manually if needed)
-- This can be used to seed initial balances from existing licensing_payouts
/*
INSERT INTO public.agency_balances (agency_id, available_cents, currency)
SELECT agency_id, SUM(amount_cents), 'USD'
FROM public.licensing_payouts
GROUP BY agency_id
ON CONFLICT (agency_id) DO UPDATE
SET available_cents = EXCLUDED.available_cents;
*/
