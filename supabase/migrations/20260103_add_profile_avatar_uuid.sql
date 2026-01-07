-- Ensure each profile has a stable local avatar UUID for mapping to Creatify
BEGIN;

-- Use gen_random_uuid() if available (Supabase enables pgcrypto by default). If not, add without default.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='profile_avatar_id'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ADD COLUMN profile_avatar_id uuid DEFAULT gen_random_uuid();
    EXCEPTION WHEN undefined_function THEN
      -- Fallback without default if gen_random_uuid is unavailable
      ALTER TABLE public.profiles ADD COLUMN profile_avatar_id uuid;
    END;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_profiles_profile_avatar_id ON public.profiles (profile_avatar_id);

COMMIT;
