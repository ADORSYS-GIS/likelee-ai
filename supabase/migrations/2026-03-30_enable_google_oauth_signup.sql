-- Allow new registrations via Google OAuth again.
-- Existing onboarding logic will decide the correct next step after auth.

DROP TRIGGER IF EXISTS on_auth_user_created_block_google ON auth.users;
DROP FUNCTION IF EXISTS public.block_google_signup();
