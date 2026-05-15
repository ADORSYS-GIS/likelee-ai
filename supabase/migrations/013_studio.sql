-- 013_studio.sql
-- Consolidated migration for studio domain (AI generation)
-- Source files: 2026-02-26_studio_integration.sql, 2026-03-02_studio_wallet_current_plan.sql,
-- 2026-03-09_studio_upscaler_cost.sql, 2026-04-14_01_studio_credit_session_unique.sql

BEGIN;

-- ============================================================================
-- 1. STUDIO WALLETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.studio_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner (polymorphic - can be agency or brand)
    owner_type text NOT NULL CHECK (owner_type IN ('agency', 'brand', 'creator')),
    owner_id uuid NOT NULL,
    
    -- Current Plan
    current_plan text NOT NULL DEFAULT 'free' CHECK (current_plan IN ('free', 'basic', 'pro', 'enterprise')),
    plan_started_at timestamptz,
    plan_expires_at timestamptz,
    
    -- Balance (credits)
    credits_balance integer NOT NULL DEFAULT 0,
    credits_reserved integer NOT NULL DEFAULT 0,
    
    -- Billing
    stripe_customer_id text,
    stripe_subscription_id text,
    
    -- Settings
    auto_recharge boolean DEFAULT false,
    auto_recharge_threshold integer DEFAULT 10,
    auto_recharge_amount integer DEFAULT 100,
    
    -- Usage tracking
    total_generations integer DEFAULT 0,
    total_credits_used integer DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_wallets_owner ON public.studio_wallets(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_studio_wallets_stripe_customer ON public.studio_wallets(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_studio_wallets_plan ON public.studio_wallets(current_plan);

ALTER TABLE public.studio_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own wallet" ON public.studio_wallets;
CREATE POLICY "Owners can view own wallet" ON public.studio_wallets
    FOR SELECT USING (
        (owner_type = 'agency' AND owner_id = auth.uid()) OR
        (owner_type = 'brand' AND owner_id = auth.uid()) OR
        (owner_type = 'creator' AND owner_id = auth.uid())
    );

-- ============================================================================
-- 2. STUDIO GENERATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.studio_generations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL REFERENCES public.studio_wallets(id) ON DELETE CASCADE,
    
    -- Generation Details
    prompt text NOT NULL,
    negative_prompt text,
    
    -- Settings
    width integer DEFAULT 1024,
    height integer DEFAULT 1024,
    num_images integer DEFAULT 1,
    
    -- Model/Provider
    model text NOT NULL DEFAULT 'fal-flux-pro',
    provider text NOT NULL DEFAULT 'fal',
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message text,
    
    -- Results
    result_urls text[],
    result_metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Cost
    credits_used integer,
    cost_cents integer,
    
    -- Timing
    started_at timestamptz,
    completed_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_generations_wallet ON public.studio_generations(wallet_id);
CREATE INDEX IF NOT EXISTS idx_studio_generations_status ON public.studio_generations(status);
CREATE INDEX IF NOT EXISTS idx_studio_generations_created ON public.studio_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_generations_model ON public.studio_generations(model);

ALTER TABLE public.studio_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wallet owners can view own generations" ON public.studio_generations;
CREATE POLICY "Wallet owners can view own generations" ON public.studio_generations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.studio_wallets w
            WHERE w.id = wallet_id AND (
                (w.owner_type = 'agency' AND w.owner_id = auth.uid()) OR
                (w.owner_type = 'brand' AND w.owner_id = auth.uid()) OR
                (w.owner_type = 'creator' AND w.owner_id = auth.uid())
            )
        )
    );

-- ============================================================================
-- 3. STUDIO PROVIDER COSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.studio_provider_costs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    provider text NOT NULL, -- 'fal', 'replicate', 'openai', etc.
    model text NOT NULL,
    
    -- Cost per generation (in cents)
    cost_per_image_cents integer NOT NULL,
    cost_per_1k_tokens_cents integer, -- for text-based
    
    -- Metadata
    is_active boolean DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (provider, model)
);

CREATE INDEX IF NOT EXISTS idx_studio_provider_costs_provider ON public.studio_provider_costs(provider);
CREATE INDEX IF NOT EXISTS idx_studio_provider_costs_active ON public.studio_provider_costs(is_active);

COMMENT ON TABLE public.studio_provider_costs IS 'Tracks per-provider/model generation costs. Used by studio billing logic.';

-- ============================================================================
-- 4. STUDIO PRICING TIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.studio_pricing_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    tier_name text NOT NULL UNIQUE,
    tier_level integer NOT NULL,
    
    -- Pricing
    monthly_price_cents integer,
    annual_price_cents integer,
    
    -- Credits
    monthly_credits integer NOT NULL,
    
    -- Features
    max_generations_per_day integer,
    max_resolution text,
    priority_processing boolean DEFAULT false,
    custom_models boolean DEFAULT false,
    api_access boolean DEFAULT false,
    
    -- Limits
    max_storage_gb integer DEFAULT 10,
    
    is_active boolean DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_pricing_tiers_active ON public.studio_pricing_tiers(is_active);

-- ============================================================================
-- 5. STUDIO CREDIT TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.studio_credit_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL REFERENCES public.studio_wallets(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus', 'adjustment')),
    
    amount integer NOT NULL, -- positive for credits added, negative for used
    
    -- Related records
    generation_id uuid REFERENCES public.studio_generations(id) ON DELETE SET NULL,
    stripe_payment_intent_id text,
    stripe_session_id text UNIQUE,
    
    -- Description
    description text,
    
    -- Balance after transaction
    balance_after integer,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_wallet ON public.studio_credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_type ON public.studio_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_generation ON public.studio_credit_transactions(generation_id);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_stripe_session ON public.studio_credit_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_created ON public.studio_credit_transactions(created_at DESC);

ALTER TABLE public.studio_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wallet owners can view own transactions" ON public.studio_credit_transactions;
CREATE POLICY "Wallet owners can view own transactions" ON public.studio_credit_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.studio_wallets w
            WHERE w.id = wallet_id AND (
                (w.owner_type = 'agency' AND w.owner_id = auth.uid()) OR
                (w.owner_type = 'brand' AND w.owner_id = auth.uid()) OR
                (w.owner_type = 'creator' AND w.owner_id = auth.uid())
            )
        )
    );

-- ============================================================================
-- 6. STUDIO CAMPAIGN DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.studio_campaign_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
    
    -- Document from generation
    generation_id uuid REFERENCES public.studio_generations(id) ON DELETE SET NULL,
    
    -- Document Details
    document_type text NOT NULL, -- 'brief', 'mood_board', 'concept_art', 'storyboard'
    title text NOT NULL,
    description text,
    
    -- File
    storage_bucket text,
    storage_path text,
    public_url text,
    
    -- Status
    is_approved boolean,
    approved_by uuid,
    approved_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_campaign_documents_campaign ON public.studio_campaign_documents(campaign_id);
CREATE INDEX IF NOT EXISTS idx_studio_campaign_documents_generation ON public.studio_campaign_documents(generation_id);
CREATE INDEX IF NOT EXISTS idx_studio_campaign_documents_type ON public.studio_campaign_documents(document_type);

ALTER TABLE public.studio_campaign_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand can view own campaign documents" ON public.studio_campaign_documents;
CREATE POLICY "Brand can view own campaign documents" ON public.studio_campaign_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.brand_campaigns c
            WHERE c.id = campaign_id AND c.brand_id = auth.uid()
        )
    );

-- ============================================================================
-- 7. ADJUST WALLET CREDITS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.adjust_wallet_credits(
    p_wallet_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_generation_id UUID DEFAULT NULL,
    p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Update wallet balance
    UPDATE public.studio_wallets
    SET credits_balance = credits_balance + p_amount,
        total_credits_used = CASE WHEN p_amount < 0 THEN total_credits_used - p_amount ELSE total_credits_used END,
        updated_at = now()
    WHERE id = p_wallet_id
    RETURNING credits_balance INTO v_new_balance;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found: %', p_wallet_id;
    END IF;
    
    -- Record transaction
    INSERT INTO public.studio_credit_transactions (
        wallet_id, transaction_type, amount, description,
        generation_id, stripe_session_id, balance_after
    ) VALUES (
        p_wallet_id, p_transaction_type, p_amount, p_description,
        p_generation_id, p_stripe_session_id, v_new_balance
    );
    
    RETURN v_new_balance;
END;
$$;

COMMIT;
