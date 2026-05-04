-- Migration: add dismissed_by_brand to campaign_offer_packages
--
-- Brands can dismiss inbox packages they no longer want to see.
-- This is a soft-hide — the agency retains full visibility of their package.
-- Packages with status = 'feedback_received' cannot be dismissed because
-- talent assignments and contracts may already be in progress.
--
-- Auto-hide logic: the brand inbox query filters out dismissed packages.
-- Expired packages (expires_at < now() - 7 days) are also excluded by the
-- query so the inbox stays clean without requiring manual action.

BEGIN;

ALTER TABLE public.campaign_offer_packages
  ADD COLUMN IF NOT EXISTS dismissed_by_brand boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaign_offer_packages.dismissed_by_brand IS
  'Set to true when the brand dismisses the package from their inbox. '
  'Does not affect agency visibility. Cannot be set when status = feedback_received.';

CREATE INDEX IF NOT EXISTS idx_campaign_offer_packages_brand_dismissed
  ON public.campaign_offer_packages(brand_id, dismissed_by_brand, created_at DESC);

COMMIT;
