BEGIN;

-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accept_negotiations boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_restrictions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_exclusivity text[] DEFAULT '{}';

COMMIT;
