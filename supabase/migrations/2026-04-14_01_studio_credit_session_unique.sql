-- Prevent double-crediting when concurrent webhook / verify calls race on the same
-- Stripe session ID. The existing index is non-unique; replace it with a partial
-- unique index (NULL values are excluded so unpurchased/deduction rows are unaffected).
--
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction, so we perform
-- the drop + recreate outside an explicit BEGIN/COMMIT block. The function
-- definition below is DDL and auto-commits per statement in PostgREST / psql.
DROP INDEX IF EXISTS idx_studio_credit_transactions_stripe_session_id;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_studio_credit_transactions_stripe_session_id
  ON public.studio_credit_transactions(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Make the adjust_wallet_credits RPC idempotent on duplicate session IDs.
--
-- Key design: the transaction INSERT is the gate (not the wallet UPDATE).
-- Two concurrent calls with the same stripe_session_id:
--   1. Both try the INSERT first.
--   2. One wins the unique-index race and gets a real row back.
--   3. The other hits ON CONFLICT and returns NULL via RETURNING.
--   4. Only the winner proceeds to UPDATE the wallet balance.
--   5. The loser reads the existing transaction and current balance,
--      returning idempotent=true without touching the wallet.
CREATE OR REPLACE FUNCTION public.adjust_wallet_credits(
    p_user_id uuid,
    p_delta bigint,
    p_reason text,
    p_provider text DEFAULT NULL,
    p_generation_id uuid DEFAULT NULL,
    p_stripe_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet_id uuid;
    v_balance_before bigint;
    v_balance_after bigint;
    v_transaction_id uuid;
    v_existing_txn_id uuid;
BEGIN
    -- Get or create wallet atomically.
    INSERT INTO public.studio_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM public.studio_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found and could not be created for user %', p_user_id;
    END IF;

    v_balance_after := v_balance_before + p_delta;

    IF v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient credits: have %, need %', v_balance_before, ABS(p_delta);
    END IF;

    -- INSERT the transaction row FIRST as the idempotency gate.
    -- The unique partial index guarantees at most one row per stripe_session_id.
    -- RETURNING id is non-NULL only for the winning insert; it is NULL on conflict.
    INSERT INTO public.studio_credit_transactions (
        wallet_id, delta, balance_after, reason, provider, generation_id, stripe_session_id
    )
    VALUES (
        v_wallet_id, p_delta, v_balance_after, p_reason, p_provider, p_generation_id, p_stripe_session_id
    )
    ON CONFLICT (stripe_session_id) WHERE stripe_session_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_transaction_id;

    -- If the insert conflicted (another transaction already claimed this session),
    -- do NOT update the wallet — the winner already did. Return the current balance.
    IF v_transaction_id IS NULL AND p_stripe_session_id IS NOT NULL THEN
        -- Re-read the committed transaction row so the caller gets a reference.
        SELECT id INTO v_existing_txn_id
        FROM public.studio_credit_transactions
        WHERE stripe_session_id = p_stripe_session_id
        LIMIT 1;

        RETURN jsonb_build_object(
            'wallet_id',       v_wallet_id,
            'balance_before',  v_balance_before,
            'balance_after',   v_balance_before,
            'transaction_id',  v_existing_txn_id,
            'idempotent',      true
        );
    END IF;

    -- Insert succeeded — now it is safe to update the wallet balance.
    UPDATE public.studio_wallets
    SET balance    = v_balance_after,
        updated_at = now()
    WHERE id = v_wallet_id;

    RETURN jsonb_build_object(
        'wallet_id',       v_wallet_id,
        'balance_before',  v_balance_before,
        'balance_after',   v_balance_after,
        'transaction_id',  v_transaction_id,
        'idempotent',      false
    );
END;
$$;
