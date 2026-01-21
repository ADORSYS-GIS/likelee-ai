-- 0009_agency_users_add_name.sql
BEGIN;

-- Add a human-readable name on agency_users
ALTER TABLE IF EXISTS public.agency_users
  ADD COLUMN IF NOT EXISTS name text;

-- Optional: quick lookup by name within an agency (composite idx)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_agency_users_agency_name' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_agency_users_agency_name ON public.agency_users(agency_id, name);
  END IF;
END $$;

COMMIT;
