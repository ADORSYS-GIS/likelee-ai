-- 2026-05-05_add_stripe_payment_intent_id_to_payments.sql
--
-- Three columns are referenced by RPCs but were never added to the payments table:
--
-- 1. stripe_payment_intent_id — used by complete_payment_link_checkout and
--    bulk_update_payments_status to record the Stripe payment intent ID.
--    Missing column caused the entire atomic RPC to fail with:
--      column "stripe_payment_intent_id" of relation "payments" does not exist
--    Result: no licensing_payouts row, no earnings, payment link never marked paid.
--
-- 2. agency_earnings_cents — used by bulk_update_payments_status to record
--    the agency's share of the payment.
--
-- 3. commission_rate — used by bulk_update_payments_status to record the
--    commission rate applied to this payment.

BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS agency_earnings_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2);

CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id
  ON public.payments (stripe_payment_intent_id);

COMMIT;
