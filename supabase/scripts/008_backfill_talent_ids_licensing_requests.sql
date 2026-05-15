BEGIN;
UPDATE public.licensing_requests
SET talent_ids = ARRAY[talent_id]
WHERE talent_id IS NOT NULL 
  AND (talent_ids IS NULL OR cardinality(talent_ids) = 0);
COMMIT;
