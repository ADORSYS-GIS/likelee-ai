BEGIN;

ALTER TABLE public.storage_assets DROP CONSTRAINT IF EXISTS storage_assets_context_type_check;
ALTER TABLE public.storage_assets ADD CONSTRAINT storage_assets_context_type_check
  CHECK (context_type IN (
    'agency_storage', 'client_file', 'talent_asset', 'talent_portfolio',
    'booking_file', 'booking_deliverable', 'campaign_offer_deliverable',
    'reference_image', 'voice_recording', 'tax_document',
    'brand_voice_asset', 'studio_document',
    'brand_storage', 'studio_generation'
  ));

COMMIT;
