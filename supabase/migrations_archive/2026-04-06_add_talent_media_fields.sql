ALTER TABLE public.agency_users
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS ai_usage text[];

COMMENT ON COLUMN public.agency_users.video_url IS 'Hero video URL for the talent profile';
COMMENT ON COLUMN public.agency_users.ai_usage IS 'Array of AI usage tags (e.g., Image, Video, Voice)';
