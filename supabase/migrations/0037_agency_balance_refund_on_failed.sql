BEGIN;

-- Update payout-request balance adjustment logic to refund available balance
-- when an approved/processing payout later fails.

CREATE OR REPLACE FUNCTION public.handle_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract from balance when a payout is approved (initial approval or transition to approved)
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved') THEN
        UPDATE public.agency_balances
        SET available_cents = available_cents - NEW.amount_cents,
            updated_at = now()
        WHERE agency_id = NEW.agency_id;
    END IF;

    -- Refund balance if a previously approved/processing payout fails
    IF (TG_OP = 'UPDATE' AND NEW.status = 'failed' AND OLD.status IN ('approved', 'processing')) THEN
        UPDATE public.agency_balances
        SET available_cents = available_cents + NEW.amount_cents,
            updated_at = now()
        WHERE agency_id = NEW.agency_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
