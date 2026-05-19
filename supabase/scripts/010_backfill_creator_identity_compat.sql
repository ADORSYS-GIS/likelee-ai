BEGIN;
UPDATE public.bookings b
SET creator_id = au.creator_id
FROM public.agency_users au
WHERE b.creator_id IS NULL AND b.talent_id = au.id AND au.creator_id IS NOT NULL;

UPDATE public.bookings b
SET relationship_id = rel.id
FROM public.agency_talent_relationships rel
WHERE b.relationship_id IS NULL
  AND rel.agency_id = b.agency_id
  AND ((b.talent_id IS NOT NULL AND rel.talent_id = b.talent_id)
    OR (b.creator_id IS NOT NULL AND rel.creator_id = b.creator_id));

UPDATE public.book_outs bo
SET creator_id = au.creator_id
FROM public.agency_users au
WHERE bo.creator_id IS NULL AND bo.talent_id = au.id AND au.creator_id IS NOT NULL;

UPDATE public.book_outs bo
SET relationship_id = rel.id
FROM public.agency_talent_relationships rel
WHERE bo.relationship_id IS NULL
  AND rel.agency_id = (SELECT b.agency_id FROM public.bookings b WHERE b.agency_user_id = bo.agency_user_id LIMIT 1)
  AND ((bo.talent_id IS NOT NULL AND rel.talent_id = bo.talent_id)
    OR (bo.creator_id IS NOT NULL AND rel.creator_id = bo.creator_id));

UPDATE public.agency_talent_package_items item
SET creator_id = au.creator_id
FROM public.agency_users au
WHERE item.creator_id IS NULL AND item.talent_id = au.id AND au.creator_id IS NOT NULL;

UPDATE public.agency_talent_package_items item
SET relationship_id = rel.id
FROM public.agency_talent_relationships rel, public.agency_talent_packages pkg
WHERE item.relationship_id IS NULL AND pkg.id = item.package_id AND rel.agency_id = pkg.agency_id
  AND ((item.talent_id IS NOT NULL AND rel.talent_id = item.talent_id)
    OR (item.creator_id IS NOT NULL AND rel.creator_id = item.creator_id));

UPDATE public.agency_files f
SET creator_id = au.creator_id
FROM public.agency_users au
WHERE f.creator_id IS NULL AND f.talent_id = au.id AND au.creator_id IS NOT NULL;

UPDATE public.agency_files f
SET relationship_id = rel.id
FROM public.agency_talent_relationships rel
WHERE f.relationship_id IS NULL AND rel.agency_id = f.agency_id
  AND ((f.talent_id IS NOT NULL AND rel.talent_id = f.talent_id)
    OR (f.creator_id IS NOT NULL AND rel.creator_id = f.creator_id));
COMMIT;
