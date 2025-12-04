-- Add profile_photo_url to profiles table
-- This column will store the public URL of the user's uploaded profile photo.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
