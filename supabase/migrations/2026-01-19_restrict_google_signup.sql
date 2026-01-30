-- Migration to prevent new signups via Google OAuth.
-- Existing users can still sign in with Google (if their accounts are linked or auto-linking is enabled).

CREATE OR REPLACE FUNCTION public.block_google_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the primary provider for this new user record is 'google'
  IF (new.raw_app_meta_data->>'provider') = 'google' THEN
    RAISE EXCEPTION 'Signups via Google are disabled. Please sign in with an existing account or use email to sign up.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
-- This trigger runs BEFORE a new user is inserted into the auth.users table.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_block_google') THEN
    CREATE TRIGGER on_auth_user_created_block_google
      BEFORE INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.block_google_signup();
  END IF;
END
$$;
