-- 20260122_scouting_trip_refinements.sql
-- Refine Scouting Trips with trip_type and locations_visited

BEGIN;

-- 1. Add trip_type to scouting_trips
ALTER TABLE public.scouting_trips
ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'Open Scouting';

-- 2. Add locations_visited to scouting_trips
-- This will store an array of objects: {id, name, date, time, prospects_found, lat, lng}
ALTER TABLE public.scouting_trips
ADD COLUMN IF NOT EXISTS locations_visited jsonb DEFAULT '[]'::jsonb;

-- 3. Update existing trips to have a default trip_type if null
UPDATE public.scouting_trips
SET trip_type = 'Open Scouting'
WHERE trip_type IS NULL;

COMMIT;
