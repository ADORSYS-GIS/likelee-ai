BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_payment_link_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_link_id uuid NOT NULL REFERENCES public.agency_payment_links(id) ON DELETE CASCADE,
    recipient_type text NOT NULL CHECK (recipient_type IN ('agency', 'creator')),
    recipient_id uuid NOT NULL,
    stripe_connect_account_id text NOT NULL,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    currency text NOT NULL DEFAULT 'USD',
    stripe_transfer_id text,
    status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'failed', 'reversed')),
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aplt_unique_recipient
  ON public.agency_payment_link_transfers(payment_link_id, recipient_type, recipient_id);

CREATE INDEX IF NOT EXISTS idx_aplt_payment_link_id
  ON public.agency_payment_link_transfers(payment_link_id);

CREATE INDEX IF NOT EXISTS idx_aplt_stripe_transfer_id
  ON public.agency_payment_link_transfers(stripe_transfer_id);

ALTER TABLE public.creator_balances
  ADD COLUMN IF NOT EXISTS earned_cents bigint NOT NULL DEFAULT 0 CHECK (earned_cents >= 0);

ALTER TABLE public.agency_balances
  ADD COLUMN IF NOT EXISTS earned_cents bigint NOT NULL DEFAULT 0 CHECK (earned_cents >= 0);

CREATE OR REPLACE FUNCTION public.handle_licensing_payout_creator_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.talent_splits IS NOT NULL AND jsonb_array_length(NEW.talent_splits) > 0 THEN
        INSERT INTO public.creator_balances (creator_id, earned_cents, available_cents, currency, updated_at)
        SELECT 
            (split->>'talent_id')::uuid,
            (split->>'amount_cents')::bigint,
            0,
            NEW.currency,
            now()
        FROM jsonb_array_elements(NEW.talent_splits) AS split
        ON CONFLICT (creator_id) DO UPDATE
        SET earned_cents = public.creator_balances.earned_cents + EXCLUDED.earned_cents,
            updated_at = now();
    END IF;

    IF NEW.talent_id IS NOT NULL AND NEW.talent_earnings_cents > 0 THEN
        INSERT INTO public.creator_balances (creator_id, earned_cents, available_cents, currency, updated_at)
        VALUES (NEW.talent_id, NEW.talent_earnings_cents, 0, NEW.currency, now())
        ON CONFLICT (creator_id) DO UPDATE
        SET earned_cents = public.creator_balances.earned_cents + EXCLUDED.earned_cents,
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_licensing_payout_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.agency_balances (agency_id, earned_cents, available_cents, currency, updated_at)
    VALUES (NEW.agency_id, NEW.amount_cents, 0, NEW.currency, now())
    ON CONFLICT (agency_id) DO UPDATE
    SET earned_cents = public.agency_balances.earned_cents + EXCLUDED.earned_cents,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
