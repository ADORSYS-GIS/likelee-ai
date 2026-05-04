-- Migration: Add Instagram sync fields to creators table
-- Date: 2026-05-04
-- Purpose: Support Instagram profile scraping and auto-sync via Apify

BEGIN;

-- Add instagram_followers to creators (if not exists)
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS instagram_followers bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_last_synced timestamptz;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_creators_instagram_handle ON public.creators(instagram_handle);
CREATE INDEX IF NOT EXISTS idx_agency_users_instagram_handle ON public.agency_users(instagram_handle);

-- Add instagram_data_cache table for caching scraped data
CREATE TABLE IF NOT EXISTS public.instagram_data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text UNIQUE NOT NULL,
  followers bigint DEFAULT 0,
  following bigint DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0.0,
  profile_pic_url text,
  bio text,
  external_url text,
  posts_count bigint,
  is_verified boolean DEFAULT false,
  is_private boolean DEFAULT false,
  last_synced timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
