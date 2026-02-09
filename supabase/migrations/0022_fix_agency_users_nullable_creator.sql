-- Migration to fix agency_users creator_id constraint
-- Issue: Creator_id is set to NOT NULL in production, but is optional during talent creation.

BEGIN;

-- Ensure creator_id is nullable
ALTER TABLE public.agency_users 
  ALTER COLUMN creator_id DROP NOT NULL;

COMMIT;
