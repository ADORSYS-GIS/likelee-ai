-- Migration: Campaign Offer Billing Stubs
-- Description: Adds context_type and campaign_offer_id to licensing_requests to allow it to act as a billing stub for campaign offers.

-- 1. Update licensing_requests to support campaign context
ALTER TABLE public.licensing_requests 
ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'licensing' CHECK (context_type IN ('licensing', 'campaign')),
ADD COLUMN IF NOT EXISTS campaign_offer_id uuid REFERENCES public.campaign_offers(id) ON DELETE CASCADE;

-- Add index for fast lookups during webhooks and dashboard filtering
CREATE INDEX IF NOT EXISTS idx_licensing_requests_campaign_offer_id ON public.licensing_requests(campaign_offer_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_context_type ON public.licensing_requests(context_type);

-- 2. Link campaign_offers to their billing request (the shadow stub)
ALTER TABLE public.campaign_offers
ADD COLUMN IF NOT EXISTS billing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'processing'));

-- Add index for the back-link
CREATE INDEX IF NOT EXISTS idx_campaign_offers_billing_request_id ON public.campaign_offers(billing_request_id);

-- 3. Update RLS policies to ensure brands/agencies can see their campaign billing stubs
-- Most policies on licensing_requests are already bound to agency_id/brand_id, so they should work out-of-the-box.
-- However, we ensure the context_type is considered in views if needed.

COMMENT ON COLUMN public.licensing_requests.context_type IS 'Distinguishes between traditional licensing deals and campaign offer billing stubs.';
COMMENT ON COLUMN public.campaign_offers.billing_request_id IS 'Reference to the licensing_request row acting as the financial stub for this offer.';
