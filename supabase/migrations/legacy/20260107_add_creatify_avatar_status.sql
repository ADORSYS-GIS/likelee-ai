-- Migration: Add creatify_avatar_status to profiles to persist avatar review state
-- Safe to run multiple times; checks column existence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'creatify_avatar_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN creatify_avatar_status TEXT;
  END IF;
END $$;
