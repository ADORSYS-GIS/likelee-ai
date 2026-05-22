BEGIN;
UPDATE public.licensing_requests lr
SET talent_ids = CASE
    WHEN au.creator_id IS NOT NULL THEN ARRAY[au.creator_id]
    WHEN lr.creator_id IS NOT NULL THEN ARRAY[lr.creator_id]
    ELSE NULL
END
FROM public.agency_users au
WHERE lr.talent_id = au.id
  AND (
      lr.talent_ids IS NULL
      OR cardinality(lr.talent_ids) = 0
      OR lr.talent_ids = ARRAY[lr.talent_id]
  );
COMMIT;
