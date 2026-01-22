-- Add missing fields to scouting_trips table
ALTER TABLE public.scouting_trips 
ADD COLUMN IF NOT EXISTS trip_type text,
ADD COLUMN IF NOT EXISTS start_time text,
ADD COLUMN IF NOT EXISTS end_time text,
ADD COLUMN IF NOT EXISTS scout_ids text[],
ADD COLUMN IF NOT EXISTS scout_names text[],
ADD COLUMN IF NOT EXISTS weather text,
ADD COLUMN IF NOT EXISTS prospects_approached integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prospects_added integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prospects_agreed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_rate numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS photos text[],
ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
ADD COLUMN IF NOT EXISTS longitude numeric(10,7),
ADD COLUMN IF NOT EXISTS locations_visited jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.scouting_trips.prospects_agreed IS 'Number of prospects who agreed/submitted during the trip';
