-- Migration: Fix creator_balances trigger to use creator_id from talent_splits
-- The previous trigger used split->>'talent_id' (which is an agency_users.id)
-- but creator_balances.creator_id references creators.id.
-- The talent_splits JSON already carries 'creator_id' (the creators table PK),
-- so we fix the trigger to use that field instead.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_licensing_payout_creator_update()
RETURNS TRIGGER AS $$
BEGIN
    -- For each talent in the talent_splits JSONB array, update their creator balance.
    -- Use 'creator_id' (creators table PK) not 'talent_id' (agency_users.id).
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

    -- Legacy single-talent case: if talent_id references creators.id directly
    IF NEW.talent_id IS NOT NULL AND NEW.talent_earnings_cents > 0 THEN
        INSERT INTO public.creator_balances (creator_id, available_cents, currency, updated_at)
        VALUES (NEW.talent_id, NEW.talent_earnings_cents, COALESCE(NULLIF(NEW.currency, ''), 'USD'), now())
        ON CONFLICT (creator_id) DO UPDATE
        SET available_cents = public.creator_balances.available_cents + EXCLUDED.available_cents,
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger (replaces the existing one from migration 0038)
DROP TRIGGER IF EXISTS tr_update_creator_balance_on_payout ON public.licensing_payouts;
CREATE TRIGGER tr_update_creator_balance_on_payout
    AFTER INSERT ON public.licensing_payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_licensing_payout_creator_update();

COMMIT;
