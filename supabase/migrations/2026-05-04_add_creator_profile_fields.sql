-- Migration: Add missing creator profile fields
-- Date: 2026-05-04
-- Purpose: Add columns required by CreatorDashboard profile save functionality

BEGIN;

-- Add missing profile fields to creators table
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS ethnicity text,
  ADD COLUMN IF NOT EXISTS creator_type text,
  ADD COLUMN IF NOT EXISTS height_cm integer,
  ADD COLUMN IF NOT EXISTS weight_kg integer,
  ADD COLUMN IF NOT EXISTS platform_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS portfolio_link text,
  ADD COLUMN IF NOT EXISTS accept_negotiations boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_restrictions text,
  ADD COLUMN IF NOT EXISTS brand_exclusivity text,
  ADD COLUMN IF NOT EXISTS public_profile_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS content_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vibes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS base_monthly_price_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_weekly_price_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'profile_setup',
  ADD COLUMN IF NOT EXISTS cameo_front_url text,
  ADD COLUMN IF NOT EXISTS cameo_back_url text,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_basic_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_pro_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_interval text DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS is_public_brands boolean DEFAULT true;

-- Add index for platform_handle (used for social lookups)
CREATE INDEX IF NOT EXISTS idx_creators_platform_handle ON public.creators(platform_handle);
CREATE INDEX IF NOT EXISTS idx_creators_tiktok_handle ON public.creators(tiktok_handle);
CREATE INDEX IF NOT EXISTS idx_creators_visibility ON public.creators(visibility);

COMMIT;
