BEGIN;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS addon_studio_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agencies_addon_studio_enabled
  ON public.agencies(addon_studio_enabled);

CREATE TABLE IF NOT EXISTS public.agency_studio_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_studio_wallets_agency_id ON public.agency_studio_wallets(agency_id);

CREATE TABLE IF NOT EXISTS public.agency_studio_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.agency_studio_wallets(id) ON DELETE CASCADE,
  delta bigint NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL CHECK (reason IN (
    'addon_purchase',
    'generation_deduction',
    'generation_refund',
    'admin_adjustment',
    'promotional_credit',
    'credit_purchase'
  )),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generation_id uuid,
  stripe_session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_studio_credit_transactions_wallet_id ON public.agency_studio_credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_agency_studio_credit_transactions_user_id ON public.agency_studio_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_studio_credit_transactions_created_at ON public.agency_studio_credit_transactions(created_at DESC);

ALTER TABLE public.agency_studio_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can view their agency's transactions" ON public.agency_studio_credit_transactions;
CREATE POLICY "Agency members can view their agency's transactions" ON public.agency_studio_credit_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_studio_wallets w
      JOIN public.agencies a ON a.id = w.agency_id
      JOIN public.agency_memberships am ON am.agency_id = a.id
      WHERE w.id = wallet_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
    )
  );

ALTER TABLE public.agency_studio_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can view their agency's wallet" ON public.agency_studio_wallets;
CREATE POLICY "Agency members can view their agency's wallet" ON public.agency_studio_wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = agency_id
        AND am.user_id = auth.uid()
        AND am.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Service role can manage agency studio wallets" ON public.agency_studio_wallets;
CREATE POLICY "Service role can manage agency studio wallets" ON public.agency_studio_wallets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role can manage agency studio transactions" ON public.agency_studio_credit_transactions;
CREATE POLICY "Service role can manage agency studio transactions" ON public.agency_studio_credit_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE OR REPLACE FUNCTION public.get_agency_studio_wallet_balance(p_agency_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance bigint;
BEGIN
  SELECT COALESCE(balance, 0) INTO v_balance
  FROM public.agency_studio_wallets
  WHERE agency_id = p_agency_id;
  
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_agency_studio_wallet(p_agency_id uuid, p_initial_balance bigint DEFAULT 2000)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  INSERT INTO public.agency_studio_wallets (agency_id, balance)
  VALUES (p_agency_id, p_initial_balance)
  ON CONFLICT (agency_id) DO UPDATE SET balance = agency_studio_wallets.balance + p_initial_balance
  RETURNING id INTO v_wallet_id;
  
  INSERT INTO public.agency_studio_credit_transactions (wallet_id, delta, balance_after, reason, metadata)
  SELECT v_wallet_id, p_initial_balance, p_initial_balance, 'addon_purchase', '{"source": "ai_studio_addon_initial_credits"}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.agency_studio_credit_transactions WHERE wallet_id = v_wallet_id AND reason = 'addon_purchase');
  
  RETURN v_wallet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_studio_wallet_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_agency_studio_wallet(uuid, bigint) TO service_role;

COMMIT;
