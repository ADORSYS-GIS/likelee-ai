-- Add payment method support for brands
BEGIN;

-- Add payment method columns to brands table
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id text,
  ADD COLUMN IF NOT EXISTS payment_method_last_four text,
  ADD COLUMN IF NOT EXISTS payment_method_brand text,
  ADD COLUMN IF NOT EXISTS payment_method_exp_month integer,
  ADD COLUMN IF NOT EXISTS payment_method_exp_year integer,
  ADD COLUMN IF NOT EXISTS payment_method_updated_at timestamptz;

-- Create payment methods history table for audit trail
CREATE TABLE IF NOT EXISTS public.brand_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL,
  card_last_four text NOT NULL,
  card_brand text NOT NULL,
  card_exp_month integer NOT NULL,
  card_exp_year integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_brand_payment_methods_brand_id ON public.brand_payment_methods (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_payment_methods_stripe_id ON public.brand_payment_methods (stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_brand_payment_methods_active ON public.brand_payment_methods (brand_id, is_active);

-- Enable RLS on payment methods table
ALTER TABLE public.brand_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment methods
DROP POLICY IF EXISTS "Brands can view their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can view their own payment methods"
  ON public.brand_payment_methods
  FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can insert their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can insert their own payment methods"
  ON public.brand_payment_methods
  FOR INSERT
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can update their own payment methods"
  ON public.brand_payment_methods
  FOR UPDATE
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can delete their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can delete their own payment methods"
  ON public.brand_payment_methods
  FOR DELETE
  USING (brand_id = auth.uid());

COMMIT;
