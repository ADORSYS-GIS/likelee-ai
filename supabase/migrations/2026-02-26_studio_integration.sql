BEGIN;

-- =====================================================================
-- STUDIO INTEGRATION SCHEMA
-- Issue #307: Likelee Studio Integration (Fal/Higgsfield/Kive)
-- =====================================================================

-- 1. Studio Wallets
-- Stores credit balance per user
CREATE TABLE IF NOT EXISTS public.studio_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_wallets_user_id ON public.studio_wallets(user_id);

-- 2. Studio Credit Transactions
-- Ledger of all credit movements (purchases, usage, refunds)
CREATE TABLE IF NOT EXISTS public.studio_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.studio_wallets(id) ON DELETE CASCADE,
  delta bigint NOT NULL, -- positive for credit additions, negative for deductions
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL CHECK (reason IN (
    'purchase',
    'generation_deduction',
    'generation_refund',
    'admin_adjustment',
    'promotional_credit'
  )),
  provider text, -- fal, higgsfield, kive (nullable for purchases)
  generation_id uuid, -- FK to studio_generations (nullable for purchases)
  stripe_session_id text, -- for purchases via Stripe
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_wallet_id ON public.studio_credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_generation_id ON public.studio_credit_transactions(generation_id);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_stripe_session_id ON public.studio_credit_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_studio_credit_transactions_created_at ON public.studio_credit_transactions(created_at DESC);

-- 3. Studio Generations
-- Records of all generation jobs (video/image/avatar) across providers
CREATE TABLE IF NOT EXISTS public.studio_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  
  provider text NOT NULL CHECK (provider IN ('fal', 'higgsfield', 'kive')),
  model text NOT NULL, -- e.g., 'veo3', 'runway', 'flux', etc.
  generation_type text NOT NULL CHECK (generation_type IN ('video', 'image', 'avatar', 'image_to_video')),
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'draft',
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- Input parameters (stored as JSONB for flexibility across different models)
  input_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Output data
  output_urls text[] DEFAULT '{}'::text[],
  output_metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Provider-specific job tracking
  provider_job_id text, -- external job ID from Fal/Higgsfield/Kive
  
  -- Credits and cost tracking
  credits_used bigint NOT NULL DEFAULT 0,
  
  -- Error tracking
  error_message text,
  error_code text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_generations_user_id ON public.studio_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_generations_campaign_id ON public.studio_generations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_studio_generations_status ON public.studio_generations(status);
CREATE INDEX IF NOT EXISTS idx_studio_generations_provider ON public.studio_generations(provider);
CREATE INDEX IF NOT EXISTS idx_studio_generations_provider_job_id ON public.studio_generations(provider_job_id);
CREATE INDEX IF NOT EXISTS idx_studio_generations_created_at ON public.studio_generations(created_at DESC);

-- 4. Studio Campaign Documents
-- Templates, deals, contracts attached to campaigns
CREATE TABLE IF NOT EXISTS public.studio_campaign_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  document_type text NOT NULL CHECK (document_type IN ('template', 'deal', 'contract', 'reference')),
  
  -- File storage
  file_name text NOT NULL,
  file_path text NOT NULL, -- Supabase storage path
  file_size bigint,
  mime_type text,
  
  -- Metadata
  title text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_campaign_documents_campaign_id ON public.studio_campaign_documents(campaign_id);
CREATE INDEX IF NOT EXISTS idx_studio_campaign_documents_user_id ON public.studio_campaign_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_campaign_documents_type ON public.studio_campaign_documents(document_type);

-- 5. Studio Provider Costs
-- Admin-configurable pricing per provider and model
CREATE TABLE IF NOT EXISTS public.studio_provider_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('fal', 'higgsfield', 'kive')),
  model text NOT NULL,
  generation_type text NOT NULL CHECK (generation_type IN ('video', 'image', 'avatar', 'image_to_video')),
  
  -- Cost in credits
  cost_per_generation bigint NOT NULL CHECK (cost_per_generation > 0),
  
  -- Optional cost modifiers based on parameters (e.g., resolution, duration)
  cost_modifiers jsonb DEFAULT '{}'::jsonb,
  
  -- Enabled/disabled flag
  enabled boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(provider, model, generation_type)
);

CREATE INDEX IF NOT EXISTS idx_studio_provider_costs_provider ON public.studio_provider_costs(provider);
CREATE INDEX IF NOT EXISTS idx_studio_provider_costs_enabled ON public.studio_provider_costs(enabled);

-- 6. Studio Pricing Tiers
-- Admin-configurable credit packages for purchase
CREATE TABLE IF NOT EXISTS public.studio_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  credits bigint NOT NULL CHECK (credits > 0),
  price_cents bigint NOT NULL CHECK (price_cents > 0),
  
  -- Display information
  label text NOT NULL,
  description text,
  
  -- Stripe product/price IDs
  stripe_product_id text,
  stripe_price_id text,
  
  -- Display order and availability
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_pricing_tiers_enabled ON public.studio_pricing_tiers(enabled);
CREATE INDEX IF NOT EXISTS idx_studio_pricing_tiers_sort_order ON public.studio_pricing_tiers(sort_order);

-- =====================================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Studio Wallets
ALTER TABLE public.studio_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.studio_wallets;
CREATE POLICY "Users can view their own wallet" ON public.studio_wallets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.studio_wallets;
CREATE POLICY "Users can insert their own wallet" ON public.studio_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Studio Credit Transactions
ALTER TABLE public.studio_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.studio_credit_transactions;
CREATE POLICY "Users can view their own transactions" ON public.studio_credit_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.studio_wallets
      WHERE studio_wallets.id = wallet_id
        AND studio_wallets.user_id = auth.uid()
    )
  );

-- Studio Generations
ALTER TABLE public.studio_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own generations" ON public.studio_generations;
CREATE POLICY "Users can view their own generations" ON public.studio_generations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own generations" ON public.studio_generations;
CREATE POLICY "Users can insert their own generations" ON public.studio_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own generations" ON public.studio_generations;
CREATE POLICY "Users can update their own generations" ON public.studio_generations
  FOR UPDATE USING (auth.uid() = user_id);

-- Studio Campaign Documents
ALTER TABLE public.studio_campaign_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view documents for their campaigns" ON public.studio_campaign_documents;
CREATE POLICY "Users can view documents for their campaigns" ON public.studio_campaign_documents
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_id
        AND (campaigns.agency_id = auth.uid() OR campaigns.talent_id IN (
          SELECT id FROM public.agency_users WHERE agency_id = auth.uid()
        ))
    )
  );

DROP POLICY IF EXISTS "Users can manage their own campaign documents" ON public.studio_campaign_documents;
CREATE POLICY "Users can manage their own campaign documents" ON public.studio_campaign_documents
  FOR ALL USING (auth.uid() = user_id);

-- Studio Provider Costs (admin read-only for regular users)
ALTER TABLE public.studio_provider_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view enabled provider costs" ON public.studio_provider_costs;
CREATE POLICY "Anyone can view enabled provider costs" ON public.studio_provider_costs
  FOR SELECT USING (enabled = true);

-- Studio Pricing Tiers (public read)
ALTER TABLE public.studio_pricing_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view enabled pricing tiers" ON public.studio_pricing_tiers;
CREATE POLICY "Anyone can view enabled pricing tiers" ON public.studio_pricing_tiers
  FOR SELECT USING (enabled = true);

-- =====================================================================
-- SEED DATA: Provider Costs
-- =====================================================================

-- Fal provider costs
INSERT INTO public.studio_provider_costs (provider, model, generation_type, cost_per_generation, enabled)
VALUES
  ('fal', 'flux', 'image', 100, true),
  ('fal', 'stable-diffusion', 'image', 50, true),
  ('fal', 'runway', 'video', 500, true),
  ('fal', 'luma', 'video', 400, true)
ON CONFLICT (provider, model, generation_type) DO NOTHING;

-- Higgsfield provider costs
INSERT INTO public.studio_provider_costs (provider, model, generation_type, cost_per_generation, enabled)
VALUES
  ('higgsfield', 'veo3', 'video', 600, true),
  ('higgsfield', 'sora2', 'video', 700, true)
ON CONFLICT (provider, model, generation_type) DO NOTHING;

-- Kive provider costs
INSERT INTO public.studio_provider_costs (provider, model, generation_type, cost_per_generation, enabled)
VALUES
  ('kive', 'midjourney', 'image', 150, true),
  ('kive', 'dall-e', 'image', 120, true)
ON CONFLICT (provider, model, generation_type) DO NOTHING;

-- =====================================================================
-- SEED DATA: Pricing Tiers
-- =====================================================================

INSERT INTO public.studio_pricing_tiers (credits, price_cents, label, description, sort_order, enabled)
VALUES
  (2000, 5900, '2,000', 'Starter pack - Perfect for trying out Studio', 1, true),
  (5000, 12900, '5,000', 'Popular choice for regular creators', 2, true),
  (10000, 23900, '10,000', 'Best value for professionals', 3, true),
  (25000, 51900, '25,000', 'For high-volume production', 4, true),
  (50000, 99900, '50,000', 'Agency tier', 5, true),
  (100000, 189900, '100,000', 'Enterprise volume', 6, true),
  (250000, 449900, '250,000', 'Studio production house', 7, true),
  (500000, 899900, '500,000', 'Maximum scale', 8, true)
ON CONFLICT DO NOTHING;

COMMIT;
