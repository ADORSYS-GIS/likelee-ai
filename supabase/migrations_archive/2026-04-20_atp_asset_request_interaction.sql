-- 2026-04-20_atp_asset_request_interaction.sql
-- Add 'asset_request' to the interaction type check constraint

BEGIN;

ALTER TABLE public.agency_talent_package_interactions
DROP CONSTRAINT IF EXISTS agency_talent_package_interactions_type_check;

ALTER TABLE public.agency_talent_package_interactions
ADD CONSTRAINT agency_talent_package_interactions_type_check
CHECK (type IN ('favorite', 'comment', 'callback', 'selected', 'consent', 'asset_request'));

-- Note: We don't need a unique index for asset_request because multiple requests might be legitimate,
-- unlike favorites or callbacks which are states.

COMMIT;
