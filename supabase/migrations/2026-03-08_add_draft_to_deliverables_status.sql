BEGIN;

-- Drop existing constraint
ALTER TABLE public.campaign_offer_deliverables 
DROP CONSTRAINT IF EXISTS campaign_offer_deliverables_status_check;

-- Add updated constraint including 'draft'
ALTER TABLE public.campaign_offer_deliverables
ADD CONSTRAINT campaign_offer_deliverables_status_check
CHECK (status IN ('draft', 'submitted', 'agency_review', 'brand_review', 'changes_requested', 'approved', 'rejected'));

-- Update default status to 'draft'
ALTER TABLE public.campaign_offer_deliverables
ALTER COLUMN status SET DEFAULT 'draft';

COMMIT;
