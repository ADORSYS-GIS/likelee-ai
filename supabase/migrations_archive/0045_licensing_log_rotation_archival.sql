-- Migration: Add archived_at columns and 30-day log rotation cleanup for licensing records
-- This prevents FK constraint issues when payouts reference licensing_requests

BEGIN;

-- 1. Add archived_at column to licensing_requests table
ALTER TABLE public.licensing_requests 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Add archived_at column to license_submissions table
ALTER TABLE public.license_submissions 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 3. Add indexes for efficient filtering and cleanup
CREATE INDEX IF NOT EXISTS idx_licensing_requests_archived_at 
ON public.licensing_requests(archived_at) 
WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_license_submissions_archived_at 
ON public.license_submissions(archived_at) 
WHERE archived_at IS NOT NULL;

-- 4. Create cleanup function for 30-day log rotation
CREATE OR REPLACE FUNCTION public.cleanup_archived_licensing_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    lr_deleted INTEGER := 0;
    ls_deleted INTEGER := 0;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Calculate 30-day cutoff
    cutoff_date := NOW() - INTERVAL '30 days';
    
    -- Delete archived license_submissions older than 30 days
    -- These should be safe to delete if no other references exist
    DELETE FROM public.license_submissions
    WHERE archived_at IS NOT NULL 
      AND archived_at < cutoff_date
      AND status = 'archived';
    
    GET DIAGNOSTICS ls_deleted = ROW_COUNT;
    
    -- Delete archived licensing_requests older than 30 days
    -- FK constraints will cascade to dependent tables
    DELETE FROM public.licensing_requests
    WHERE archived_at IS NOT NULL 
      AND archived_at < cutoff_date
      AND status = 'archived';
    
    GET DIAGNOSTICS lr_deleted = ROW_COUNT;
    
    deleted_count := ls_deleted + lr_deleted;
    
    -- Log the cleanup (will appear in PostgreSQL logs)
    RAISE NOTICE 'Log rotation cleanup completed: % license_submissions, % licensing_requests deleted (older than %)', 
        ls_deleted, lr_deleted, cutoff_date;
    
    RETURN deleted_count;
END;
$$;

-- 5. Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_archived_licensing_records() TO service_role;

-- 6. Create a view for active (non-archived) licensing requests
-- This simplifies dashboard queries
CREATE OR REPLACE VIEW public.active_licensing_requests AS
SELECT *
FROM public.licensing_requests
WHERE archived_at IS NULL;

-- 7. Create a view for active (non-archived) license submissions
CREATE OR REPLACE VIEW public.active_license_submissions AS
SELECT *
FROM public.license_submissions
WHERE archived_at IS NULL;

-- 8. Add comments for documentation
COMMENT ON COLUMN public.licensing_requests.archived_at IS 
    'Timestamp when record was archived after payment. Records older than 30 days may be cleaned up.';

COMMENT ON COLUMN public.license_submissions.archived_at IS 
    'Timestamp when record was archived after payment. Records older than 30 days may be cleaned up.';

COMMENT ON FUNCTION public.cleanup_archived_licensing_records() IS 
    'Removes licensing records archived more than 30 days ago. Run via scheduled job or pg_cron.';

COMMIT;
