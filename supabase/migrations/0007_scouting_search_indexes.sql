-- Add indexes for search and filter performance
-- This migration adds indexes to improve query performance for the scouting prospects search and filter functionality

BEGIN;

-- Full-text search index on full_name for faster name searches
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_full_name_trgm 
  ON public.scouting_prospects USING gin (full_name gin_trgm_ops);

-- Index on email for faster email searches
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_email 
  ON public.scouting_prospects (email);

-- Index on instagram_handle for faster Instagram handle searches
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_instagram 
  ON public.scouting_prospects (instagram_handle);

-- Composite index on (agency_id, status) for filtered queries
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_agency_status 
  ON public.scouting_prospects (agency_id, status);

-- Composite index on (agency_id, source) for source filtering
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_agency_source 
  ON public.scouting_prospects (agency_id, source);

-- GIN index on categories array for category filtering
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_categories 
  ON public.scouting_prospects USING gin (categories);

-- Index on rating for rating-based filtering
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_rating 
  ON public.scouting_prospects (rating);

-- Index on discovery_date for sorting
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_discovery_date 
  ON public.scouting_prospects (discovery_date DESC);

COMMIT;
