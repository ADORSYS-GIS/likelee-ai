BEGIN;

ALTER TABLE public.campaign_offer_deliverables
  DROP CONSTRAINT IF EXISTS campaign_offer_deliverables_status_check;

ALTER TABLE public.campaign_offer_deliverables
  ADD CONSTRAINT campaign_offer_deliverables_status_check
    CHECK (status IN (
      'draft',
      'submitted',
      'agency_review',
      'brand_review',
      'brand_approved',
      'changes_requested',
      'approved',
      'rejected'
    ));

COMMIT;
