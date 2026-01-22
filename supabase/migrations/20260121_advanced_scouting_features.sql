-- 20260121_advanced_scouting_features.sql
-- Advanced Scouting Features: Expanded Events, Prospects, and Trips

BEGIN;

-- 1. Expand Scouting Events
ALTER TABLE public.scouting_events
ADD COLUMN IF NOT EXISTS expected_attendance integer,
ADD COLUMN IF NOT EXISTS is_attending boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS prospects_to_meet jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS past_success_rate numeric(5,2),
ADD COLUMN IF NOT EXISTS calendar_event_id text,
ADD COLUMN IF NOT EXISTS sync_with_calendar boolean DEFAULT true;

-- 2. Expand Scouting Prospects
ALTER TABLE public.scouting_prospects
ADD COLUMN IF NOT EXISTS is_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS social_activity_concentration numeric(5,2),
ADD COLUMN IF NOT EXISTS competition_presence text,
ADD COLUMN IF NOT EXISTS demographics jsonb DEFAULT '{}'::jsonb, -- age, income, ethnicity, style
ADD COLUMN IF NOT EXISTS social_post_locations jsonb DEFAULT '[]'::jsonb, -- Array of {lat, lng, platform, post_url}
ADD COLUMN IF NOT EXISTS trending_score numeric(5,2) DEFAULT 0.00;

-- 3. Expand Scouting Trips
ALTER TABLE public.scouting_trips
ADD COLUMN IF NOT EXISTS scout_ids uuid[] DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS route jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS prospects_approached integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prospects_agreed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prospects_added integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate numeric(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_cost numeric(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS weather text,
ADD COLUMN IF NOT EXISTS best_locations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weather_forecast jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS historical_weather_success_correlation numeric(5,2);

-- 4. Create Scouting Analytics Table (for aggregate data)
CREATE TABLE IF NOT EXISTS public.scouting_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value jsonb NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_analytics_agency_id ON public.scouting_analytics(agency_id);
CREATE INDEX IF NOT EXISTS idx_scouting_analytics_metric_name ON public.scouting_analytics(metric_name);

-- 5. Scouting Territories
CREATE TABLE IF NOT EXISTS public.scouting_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  boundary jsonb NOT NULL, -- GeoJSON polygon
  assigned_scout_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  color text DEFAULT '#4f46e5',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_territories_agency_id ON public.scouting_territories(agency_id);

-- RLS for Territories
ALTER TABLE public.scouting_territories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency members can all territories" ON public.scouting_territories;
CREATE POLICY "Agency members can all territories" ON public.scouting_territories
  FOR ALL USING (agency_id = auth.uid());

-- 6. Scouting Locations (Specific venues/spots)
CREATE TABLE IF NOT EXISTS public.scouting_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_type text,
  rating integer DEFAULT 3,
  address text,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  frequency text,
  best_days text[],
  best_times text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scouting_locations_agency_id ON public.scouting_locations(agency_id);

-- RLS for Locations
ALTER TABLE public.scouting_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency members can all locations" ON public.scouting_locations;
CREATE POLICY "Agency members can all locations" ON public.scouting_locations
  FOR ALL USING (agency_id = auth.uid());

COMMIT;
