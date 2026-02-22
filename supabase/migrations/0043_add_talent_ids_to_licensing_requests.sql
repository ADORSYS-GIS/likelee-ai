-- Migration: Add talent_ids to licensing_requests for multi-talent support
-- This allows caching the set of talents involved in a request directly on the request row.

BEGIN;

-- 1. Add talent_ids column (uuid array) to licensing_requests
ALTER TABLE public.licensing_requests
    ADD COLUMN IF NOT EXISTS talent_ids uuid[] DEFAULT '{}';

-- 2. Backfill talent_ids from talent_id for existing requests
UPDATE public.licensing_requests
SET talent_ids = ARRAY[talent_id]
WHERE talent_id IS NOT NULL 
  AND (talent_ids IS NULL OR cardinality(talent_ids) = 0);

-- 3. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_licensing_requests_talent_ids ON public.licensing_requests USING GIN(talent_ids);

-- 4. Add comment
COMMENT ON COLUMN public.licensing_requests.talent_ids IS 'Array of talent IDs (agency_users.id) associated with this licensing request.';

COMMIT;
