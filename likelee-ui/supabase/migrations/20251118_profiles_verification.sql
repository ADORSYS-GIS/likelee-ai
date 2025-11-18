-- Migration: extend profiles with verification fields
-- Description: Adds KYC and liveness verification fields stored in Supabase profiles
-- Safe to re-run: Yes (adds columns if not exists)

-- Add columns if they do not exist
alter table public.profiles
  add column if not exists kyc_status text check (kyc_status in ('not_started','pending','approved','rejected')) default 'not_started',
  add column if not exists liveness_status text check (liveness_status in ('not_started','pending','approved','rejected')) default 'not_started',
  add column if not exists kyc_provider text,
  add column if not exists kyc_session_id text,
  add column if not exists verified_at timestamptz;
