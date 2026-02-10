-- 0023_fix_agency_clients_follow_up_column.sql
BEGIN;

-- Add missing next_follow_up_date column to agency_clients
-- This column was used in the code but accidentally omitted from previous migrations
ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS next_follow_up_date date;

COMMIT;
