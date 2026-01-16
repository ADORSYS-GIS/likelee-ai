-- Moderation events table for on-upload image scanning via AWS Rekognition
-- Creates a queue for manual review of flagged images.

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  user_id text,
  image_role text,
  flagged boolean NOT NULL DEFAULT false,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_moderation_events_flagged ON public.moderation_events(flagged);
CREATE INDEX IF NOT EXISTS idx_moderation_events_review_status ON public.moderation_events(review_status);
CREATE INDEX IF NOT EXISTS idx_moderation_events_created_at ON public.moderation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_user_id ON public.moderation_events(user_id);

-- RLS policies (optional; uncomment and adjust as needed for your environment)
-- ALTER TABLE public.moderation_events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service role" ON public.moderation_events FOR ALL USING (auth.role() = 'service_role');
-- CREATE POLICY "Admins can read" ON public.moderation_events FOR SELECT USING (true);
-- CREATE POLICY "Admins can modify" ON public.moderation_events FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Admins can modify" ON public.moderation_events FOR UPDATE USING (true);
-- CREATE POLICY "Admins can modify" ON public.moderation_events FOR DELETE USING (true);
