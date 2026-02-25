-- Add expires_at to agency_catalogs
ALTER TABLE agency_catalogs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Comment for clarity
COMMENT ON COLUMN agency_catalogs.expires_at IS 'Expiration date and time for the public catalog link.';
