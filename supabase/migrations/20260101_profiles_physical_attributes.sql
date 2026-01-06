BEGIN;

-- Add physical attributes to profiles for Faces/Talents discovery
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS race text,
  ADD COLUMN IF NOT EXISTS hair_color text,
  ADD COLUMN IF NOT EXISTS hairstyle text,
  ADD COLUMN IF NOT EXISTS eye_color text,
  ADD COLUMN IF NOT EXISTS height_cm integer,
  ADD COLUMN IF NOT EXISTS weight_kg integer,
  ADD COLUMN IF NOT EXISTS facial_features text[],
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'creator',
  ADD COLUMN IF NOT EXISTS tagline text;

-- Helpful indexes for filtering
CREATE INDEX IF NOT EXISTS profiles_age_idx ON public.profiles(age);
CREATE INDEX IF NOT EXISTS profiles_race_idx ON public.profiles(race);
CREATE INDEX IF NOT EXISTS profiles_hair_color_idx ON public.profiles(hair_color);
CREATE INDEX IF NOT EXISTS profiles_hairstyle_idx ON public.profiles(hairstyle);
CREATE INDEX IF NOT EXISTS profiles_eye_color_idx ON public.profiles(eye_color);
CREATE INDEX IF NOT EXISTS profiles_height_cm_idx ON public.profiles(height_cm);
CREATE INDEX IF NOT EXISTS profiles_weight_kg_idx ON public.profiles(weight_kg);
CREATE INDEX IF NOT EXISTS profiles_facial_features_gin ON public.profiles USING GIN (facial_features);

COMMIT;


