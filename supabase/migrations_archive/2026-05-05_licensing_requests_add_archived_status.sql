-- 2026-05-05_licensing_requests_add_archived_status.sql
--
-- The complete_payment_link_checkout RPC sets licensing_requests.status = 'archived'
-- after a successful payment, but the check constraint only allows:
--   pending, negotiating, approved, rejected, declined
--
-- This caused the entire atomic RPC to fail with:
--   new row for relation "licensing_requests" violates check constraint
--   "licensing_requests_status_check"
--
-- Note: archived_at column already exists (added in 0045_licensing_log_rotation_archival.sql)

BEGIN;

ALTER TABLE public.licensing_requests
  DROP CONSTRAINT IF EXISTS licensing_requests_status_check;

ALTER TABLE public.licensing_requests
  ADD CONSTRAINT licensing_requests_status_check
  CHECK (status IN ('pending', 'negotiating', 'approved', 'rejected', 'declined', 'archived'));

COMMIT;
