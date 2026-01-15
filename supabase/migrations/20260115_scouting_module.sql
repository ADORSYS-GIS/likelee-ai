-- 20260115_scouting_module.sql
-- Scouting Module: Prospects, Trips, Events, and Submissions

BEGIN;

-- 1. Scouting Prospects
CREATE TABLE IF NOT EXISTS public.scouting_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  
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
  status text NOT NULL DEFAULT 'new', -- new, contacted, meeting, signed, rejected
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
  agency_id uuid NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  location text NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'planned', -- planned, ongoing, completed
  description text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_trips_agency_id ON public.scouting_trips(agency_id);

-- 3. Scouting Events (Open Calls)
CREATE TABLE IF NOT EXISTS public.scouting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  
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
  agency_id uuid NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  
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

-- Enable RLS
ALTER TABLE public.scouting_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_submissions ENABLE ROW LEVEL SECURITY;

-- Policy Helper: Check if user is a member of the agency
-- We reuse the logic from agency_users policies:
-- User must be the owner OR exist in agency_users for that agency

-- Prospects Policies
CREATE POLICY "Agency members can select prospects" ON public.scouting_prospects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_profiles p 
      WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.agency_users au 
      WHERE au.agency_id = agency_id AND au.user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can insert prospects" ON public.scouting_prospects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_profiles p 
      WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.agency_users au 
      WHERE au.agency_id = agency_id AND au.user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can update prospects" ON public.scouting_prospects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_profiles p 
      WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.agency_users au 
      WHERE au.agency_id = agency_id AND au.user_id = auth.uid()
    )
  );

CREATE POLICY "Agency members can delete prospects" ON public.scouting_prospects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_profiles p 
      WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.agency_users au 
      WHERE au.agency_id = agency_id AND au.user_id = auth.uid()
    )
  );

-- Repeat similar policies for Trips, Events, and Submissions
-- (Simplified for brevity, assuming same access pattern)

-- Trips
CREATE POLICY "Agency members can all trips" ON public.scouting_trips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_profiles p 
      WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.agency_users au 
      WHERE au.agency_id = agency_id AND au.user_id = auth.uid()
    )
  );

-- Events
CREATE POLICY "Agency members can all events" ON public.scouting_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_profiles p 
      WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.agency_users au 
      WHERE au.agency_id = agency_id AND au.user_id = auth.uid()
    )
  );

-- Submissions
CREATE POLICY "Agency members can all submissions" ON public.scouting_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_profiles p 
      WHERE p.id = agency_id AND p.owner_user_id = auth.uid()
    ) OR 
    EXISTS (
      SELECT 1 FROM public.agency_users au 
      WHERE au.agency_id = agency_id AND au.user_id = auth.uid()
    )
  );

COMMIT;
