-- Allow selected interaction type for package interactions

BEGIN;

ALTER TABLE public.agency_talent_package_interactions
    DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_type_check;

ALTER TABLE public.agency_talent_package_interactions
    ADD CONSTRAINT agency_talent_package_interactions_type_check
    CHECK (type IN ('favorite', 'comment', 'callback', 'selected'));

COMMIT;
