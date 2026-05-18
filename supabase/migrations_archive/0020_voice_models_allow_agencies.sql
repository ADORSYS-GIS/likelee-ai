BEGIN;

-- Allow agency users (and other auth users) to use voice recording/model features.
-- Previously these tables referenced public.creators(id) which blocks agency IDs.

ALTER TABLE public.voice_recordings
  DROP CONSTRAINT IF EXISTS voice_recordings_user_id_fkey;

ALTER TABLE public.voice_recordings
  ADD CONSTRAINT voice_recordings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.voice_models
  DROP CONSTRAINT IF EXISTS voice_models_user_id_fkey;

ALTER TABLE public.voice_models
  ADD CONSTRAINT voice_models_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;
