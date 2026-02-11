-- 0002_scouting_module.sql
-- Scouting Module: Prospects, Trips, Events, and Submissions
-- Enable trigram extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;


BEGIN;

-- 1. Scouting Prospects
CREATE TABLE IF NOT EXISTS public.scouting_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  -- Basic Info
  full_name text NOT NULL,
  email text,
  phone text,
  instagram_handle text,
  
  -- Attributes & Metrics
  categories text[], -- e.g. ['Model', 'Actor']
  instagram_followers bigint,
  engagement_rate numeric(5,2), -- e.g. 4.50
  
  -- Status & Assignment
  status text NOT NULL DEFAULT 'new', -- new, contacted, meeting, test_shoot, offer_sent, signed, declined
  assigned_agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_agent_name text, -- Cache name for display
  
  -- Discovery Details
  source text, -- instagram, tiktok, street, referral, website
  discovery_date date DEFAULT CURRENT_DATE,
  discovery_location text,
  referred_by text,
  
  -- Metadata
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for prospects
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_agency_id ON public.scouting_prospects(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_status ON public.scouting_prospects(status);
CREATE INDEX IF NOT EXISTS idx_scouting_prospects_assigned_agent ON public.scouting_prospects(assigned_agent_id);

-- 2. Scouting Trips
CREATE TABLE IF NOT EXISTS public.scouting_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  location text NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'planned', -- planned, ongoing, completed
  description text,

  -- Consolidated fields
  trip_type text,
  start_time text,
  end_time text,
  scout_ids text[],
  scout_names text[],
  weather text,
  prospects_approached integer DEFAULT 0,
  prospects_added integer DEFAULT 0,
  prospects_agreed integer DEFAULT 0, -- Number of prospects who agreed/submitted during the trip
  conversion_rate numeric(5,2) DEFAULT 0,
  total_cost numeric(12,2) DEFAULT 0,
  photos text[],
  latitude numeric(10,7),
  longitude numeric(10,7),
  locations_visited jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS conversion_rate numeric(5,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_scouting_trips_agency_id ON public.scouting_trips(agency_id);

-- 3. Scouting Events (Open Calls)
CREATE TABLE IF NOT EXISTS public.scouting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  event_date timestamptz NOT NULL,
  location text NOT NULL,
  description text,
  status text DEFAULT 'scheduled', -- scheduled, completed, cancelled
  
  -- Expanded fields
  event_type text,
  casting_for text,
  start_time text,
  end_time text,
  looking_for text[],
  min_age integer DEFAULT 18,
  max_age integer DEFAULT 30,
  gender_preference text DEFAULT 'all',
  special_skills text,
  what_to_bring text,
  dress_code text,
  location_details text,
  virtual_link text,
  max_attendees integer,
  registration_required boolean DEFAULT false,
  internal_notes text,
  contact_name text,
  contact_email text,
  contact_phone text,
  targeted_talent_goal integer,
  registration_fee numeric(10,2),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_events_agency_id ON public.scouting_events(agency_id);

-- 4. Scouting Submissions (Website Applications)
CREATE TABLE IF NOT EXISTS public.scouting_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  email text NOT NULL,
  photos text[],
  instagram text,
  status text DEFAULT 'pending', -- pending, reviewed, contacted, rejected
  submitted_at timestamptz DEFAULT now(),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_submissions_agency_id ON public.scouting_submissions(agency_id);

-- RLS Policies
ALTER TABLE public.scouting_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_submissions ENABLE ROW LEVEL SECURITY;

-- Prospects Policies
DROP POLICY IF EXISTS "Agency members can select prospects" ON public.scouting_prospects;
CREATE POLICY "Agency members can select prospects" ON public.scouting_prospects
  FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can insert prospects" ON public.scouting_prospects;
CREATE POLICY "Agency members can insert prospects" ON public.scouting_prospects
  FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can update prospects" ON public.scouting_prospects;
CREATE POLICY "Agency members can update prospects" ON public.scouting_prospects
  FOR UPDATE USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agency members can delete prospects" ON public.scouting_prospects;
CREATE POLICY "Agency members can delete prospects" ON public.scouting_prospects
  FOR DELETE USING (agency_id = auth.uid());

-- Trips
DROP POLICY IF EXISTS "Agency members can all trips" ON public.scouting_trips;
CREATE POLICY "Agency members can all trips" ON public.scouting_trips
  FOR ALL USING (agency_id = auth.uid());

-- Events
DROP POLICY IF EXISTS "Agency members can all events" ON public.scouting_events;
CREATE POLICY "Agency members can all events" ON public.scouting_events
  FOR ALL USING (agency_id = auth.uid());

-- Submissions
DROP POLICY IF EXISTS "Agency members can all submissions" ON public.scouting_submissions;
CREATE POLICY "Agency members can all submissions" ON public.scouting_submissions
  FOR ALL USING (agency_id = auth.uid());


-- Add indexes for search and filter performance
-- This migration adds indexes to improve query performance for the scouting prospects search and filter functionality

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
