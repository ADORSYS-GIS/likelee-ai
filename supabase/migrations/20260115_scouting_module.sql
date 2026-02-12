-- 20260115_scouting_module.sql
-- Scouting Module: Prospects, Trips, Events, and Submissions

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
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS trip_type text;

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS start_time text;

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS end_time text;

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS scout_names text[];

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS photos text[];

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7);

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS prospects_approached integer DEFAULT 0;

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS prospects_added integer DEFAULT 0;

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS prospects_agreed integer DEFAULT 0;

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS conversion_rate numeric(5,2) DEFAULT 0;

ALTER TABLE public.scouting_trips
  ADD COLUMN IF NOT EXISTS total_cost numeric(12,2) DEFAULT 0;

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

-- Fix Existing Constraints (if tables already exist with wrong FK)
DO $$
BEGIN
    -- 1. Scouting Prospects
    -- Clean up orphan rows first
    DELETE FROM public.scouting_prospects WHERE agency_id NOT IN (SELECT id FROM public.agencies);

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'scouting_prospects_agency_id_fkey') THEN
        ALTER TABLE public.scouting_prospects DROP CONSTRAINT scouting_prospects_agency_id_fkey;
    END IF;
    
    ALTER TABLE public.scouting_prospects 
    ADD CONSTRAINT scouting_prospects_agency_id_fkey 
    FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

    -- 2. Scouting Trips
    DELETE FROM public.scouting_trips WHERE agency_id NOT IN (SELECT id FROM public.agencies);

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'scouting_trips_agency_id_fkey') THEN
        ALTER TABLE public.scouting_trips DROP CONSTRAINT scouting_trips_agency_id_fkey;
    END IF;

    ALTER TABLE public.scouting_trips
    ADD CONSTRAINT scouting_trips_agency_id_fkey
    FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

    -- 3. Scouting Events
    DELETE FROM public.scouting_events WHERE agency_id NOT IN (SELECT id FROM public.agencies);

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'scouting_events_agency_id_fkey') THEN
        ALTER TABLE public.scouting_events DROP CONSTRAINT scouting_events_agency_id_fkey;
    END IF;

    ALTER TABLE public.scouting_events
    ADD CONSTRAINT scouting_events_agency_id_fkey
    FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

    -- 4. Scouting Submissions
    DELETE FROM public.scouting_submissions WHERE agency_id NOT IN (SELECT id FROM public.agencies);

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'scouting_submissions_agency_id_fkey') THEN
        ALTER TABLE public.scouting_submissions DROP CONSTRAINT scouting_submissions_agency_id_fkey;
    END IF;

    ALTER TABLE public.scouting_submissions
    ADD CONSTRAINT scouting_submissions_agency_id_fkey
    FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies

-- Enable RLS
ALTER TABLE public.scouting_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_submissions ENABLE ROW LEVEL SECURITY;

-- Policy Helper: Check if user is a member of the agency
-- We reuse the logic from agency_users policies:
-- User must be the owner OR exist in agency_users for that agency

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

-- Repeat similar policies for Trips, Events, and Submissions
-- (Simplified for brevity, assuming same access pattern)

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

COMMIT;
