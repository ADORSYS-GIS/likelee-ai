-- ============================================================
-- 0056_agency_catalogs.sql
-- Post-payment asset+voice delivery catalogs for agencies.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. agency_catalogs – root record per catalog
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_catalogs (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id              UUID        NOT NULL REFERENCES agencies(id)  ON DELETE CASCADE,
  licensing_request_id   UUID        REFERENCES licensing_requests(id) ON DELETE SET NULL,
  title                  TEXT        NOT NULL,
  client_name            TEXT,
  client_email           TEXT,
  access_token           TEXT        UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at             TIMESTAMPTZ,
  sent_at                TIMESTAMPTZ,
  notes                  TEXT
);

-- ────────────────────────────────────────────────────────────
-- 2. agency_catalog_items – one row per talent in the catalog
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_catalog_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id  UUID NOT NULL REFERENCES agency_catalogs(id) ON DELETE CASCADE,
  talent_id   UUID NOT NULL REFERENCES agency_users(id)    ON DELETE CASCADE,
  sort_order  INT  NOT NULL DEFAULT 0,
  UNIQUE (catalog_id, talent_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. agency_catalog_assets – cherry-picked digital assets
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_catalog_assets (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID  NOT NULL REFERENCES agency_catalog_items(id) ON DELETE CASCADE,
  asset_id        TEXT  NOT NULL,
  asset_type      TEXT  NOT NULL DEFAULT 'image',
  sort_order      INT   NOT NULL DEFAULT 0
);

-- ────────────────────────────────────────────────────────────
-- 4. agency_catalog_recordings – cherry-picked voice recordings
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_catalog_recordings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_item_id UUID NOT NULL REFERENCES agency_catalog_items(id) ON DELETE CASCADE,
  recording_id    UUID NOT NULL REFERENCES voice_recordings(id)     ON DELETE CASCADE,
  emotion_tag     TEXT,
  sort_order      INT  NOT NULL DEFAULT 0
);

-- ────────────────────────────────────────────────────────────
-- 5. Indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agency_catalogs_agency_id
  ON agency_catalogs(agency_id);

CREATE INDEX IF NOT EXISTS idx_agency_catalogs_access_token
  ON agency_catalogs(access_token);

CREATE INDEX IF NOT EXISTS idx_agency_catalog_items_catalog_id
  ON agency_catalog_items(catalog_id);

CREATE INDEX IF NOT EXISTS idx_agency_catalog_items_talent_id
  ON agency_catalog_items(talent_id);

CREATE INDEX IF NOT EXISTS idx_agency_catalog_recordings_recording_id
  ON agency_catalog_recordings(recording_id);

CREATE INDEX IF NOT EXISTS idx_agency_catalog_assets_asset_id
  ON agency_catalog_assets(asset_id);

-- ────────────────────────────────────────────────────────────
-- 6. RLS Policies
-- ────────────────────────────────────────────────────────────
ALTER TABLE agency_catalogs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_catalog_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_catalog_assets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_catalog_recordings ENABLE ROW LEVEL SECURITY;

-- Agency can manage its own catalogs
CREATE POLICY agency_catalogs_agency_policy ON agency_catalogs
  FOR ALL USING (agency_id = auth.uid());

-- Cascade ownership via parent catalog
CREATE POLICY agency_catalog_items_policy ON agency_catalog_items
  FOR ALL USING (
    catalog_id IN (SELECT id FROM agency_catalogs WHERE agency_id = auth.uid())
  );

CREATE POLICY agency_catalog_assets_policy ON agency_catalog_assets
  FOR ALL USING (
    catalog_item_id IN (
      SELECT ci.id FROM agency_catalog_items ci
      JOIN agency_catalogs c ON c.id = ci.catalog_id
      WHERE c.agency_id = auth.uid()
    )
  );

CREATE POLICY agency_catalog_recordings_policy ON agency_catalog_recordings
  FOR ALL USING (
    catalog_item_id IN (
      SELECT ci.id FROM agency_catalog_items ci
      JOIN agency_catalogs c ON c.id = ci.catalog_id
      WHERE c.agency_id = auth.uid()
    )
  );
