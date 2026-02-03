-- This migration corrects the foreign key constraints on package items and interactions
-- to reference the agency_users table instead of the creators table.

BEGIN;

-- Drop the incorrect foreign key constraint on agency_talent_package_items
ALTER TABLE public.agency_talent_package_items
DROP CONSTRAINT IF EXISTS agency_talent_package_items_talent_id_fkey;

-- Add the correct foreign key constraint referencing agency_users
ALTER TABLE public.agency_talent_package_items
ADD CONSTRAINT agency_talent_package_items_talent_id_fkey
FOREIGN KEY (talent_id) REFERENCES public.agency_users(id) ON DELETE CASCADE;

-- Drop the incorrect foreign key constraint on agency_talent_package_interactions
ALTER TABLE public.agency_talent_package_interactions
DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_talent_id_fkey;

-- Add the correct foreign key constraint referencing agency_users
ALTER TABLE public.agency_talent_package_interactions
ADD CONSTRAINT agency_talent_package_interactions_talent_id_fkey
FOREIGN KEY (talent_id) REFERENCES public.agency_users(id) ON DELETE SET NULL;

COMMIT;
