-- Add signed_document_url to campaign_offer_contracts for storing the final signed PDF URL
ALTER TABLE public.campaign_offer_contracts
  ADD COLUMN IF NOT EXISTS signed_document_url text;
