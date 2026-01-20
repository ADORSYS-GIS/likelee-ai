-- 20260120_expand_scouting_events.sql
-- Expand scouting_events table with detailed fields for casting events

BEGIN;

ALTER TABLE public.scouting_events 
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS casting_for text,
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS looking_for text[],
  ADD COLUMN IF NOT EXISTS min_age integer DEFAULT 18,
  ADD COLUMN IF NOT EXISTS max_age integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS gender_preference text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS special_skills text,
  ADD COLUMN IF NOT EXISTS what_to_bring text,
  ADD COLUMN IF NOT EXISTS dress_code text,
  ADD COLUMN IF NOT EXISTS location_details text,
  ADD COLUMN IF NOT EXISTS virtual_link text,
  ADD COLUMN IF NOT EXISTS max_attendees integer,
  ADD COLUMN IF NOT EXISTS registration_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- Update status to include 'draft'
-- Note: status already exists, but we might want to ensure it supports 'draft' and 'published'
-- The existing status has 'scheduled', 'completed', 'cancelled'.
-- We'll add 'draft' and 'published' logic in the application layer or via check constraints if needed.

COMMIT;
