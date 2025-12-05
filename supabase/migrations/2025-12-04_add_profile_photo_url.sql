-- Add profile_photo_url column to profiles table
-- This enables persistent storage of user profile photos

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_url text;

COMMIT;
