-- Add trial_started_at to public.creators table
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
