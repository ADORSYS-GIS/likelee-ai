-- 0017_update_package_items_ref.sql
-- Redirect package item talent links from 'creators' to 'agency_users'
-- This allows prospects and mock accounts to be included in curated packages.

BEGIN;

-- 1. Drop the existing foreign key constraint
ALTER TABLE public.agency_talent_package_items
DROP CONSTRAINT IF EXISTS agency_talent_package_items_talent_id_fkey;

-- 2. Add the new foreign key constraint pointing to agency_users
ALTER TABLE public.agency_talent_package_items
ADD CONSTRAINT agency_talent_package_items_talent_id_fkey
FOREIGN KEY (talent_id) REFERENCES public.agency_users(id) ON DELETE CASCADE;

-- 3. Update the view count increment RPC (if needed, but usually it references package_id not talent_id)

COMMIT;
