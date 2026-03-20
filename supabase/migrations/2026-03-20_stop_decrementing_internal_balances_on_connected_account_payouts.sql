-- 2026-03-20_stop_decrementing_internal_balances_on_connected_account_payouts.sql
-- The payout request endpoints create Stripe Payouts on the CONNECTED account balance.
-- Therefore, they must NOT modify Likelee internal "held/pending" balances.
-- Internal balances should only decrement when the platform successfully transfers funds out.

BEGIN;

-- Creator payout requests: stop subtracting/refunding internal balances on approval/failure.
CREATE OR REPLACE FUNCTION public.handle_creator_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op for internal balances: creator payouts are executed on the connected account balance.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agency payout requests: stop subtracting internal balances on approval.
CREATE OR REPLACE FUNCTION public.handle_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op for internal balances: agency payouts are executed on the connected account balance.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

