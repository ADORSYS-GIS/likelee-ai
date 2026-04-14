-- Migration: Ensure last_role_changed_at column exists in organization_memberships
-- Issue: Some databases may have been created before this column was added

BEGIN;

-- Add the column if it doesn't exist
ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS last_role_changed_at timestamptz NOT NULL DEFAULT now();

COMMIT;
