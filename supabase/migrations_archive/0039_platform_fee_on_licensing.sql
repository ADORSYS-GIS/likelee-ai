BEGIN;

-- Add platform fee fields to payment links and payouts so ledger updates remain deterministic.

ALTER TABLE public.agency_payment_links
  ADD COLUMN IF NOT EXISTS platform_fee_cents bigint NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS net_amount_cents bigint NOT NULL DEFAULT 0 CHECK (net_amount_cents >= 0);

ALTER TABLE public.licensing_payouts
  ADD COLUMN IF NOT EXISTS platform_fee_cents bigint NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS net_amount_cents bigint NOT NULL DEFAULT 0 CHECK (net_amount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_agency_payment_links_platform_fee_cents ON public.agency_payment_links (platform_fee_cents);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_platform_fee_cents ON public.licensing_payouts (platform_fee_cents);

COMMIT;
