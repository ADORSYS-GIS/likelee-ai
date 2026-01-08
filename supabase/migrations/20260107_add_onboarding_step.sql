ALTER TABLE public.organization_profiles 
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'email_verification';

COMMENT ON COLUMN public.organization_profiles.onboarding_step IS 
'Tracks signup progress: email_verification | details_pending | complete';

UPDATE public.organization_profiles 
SET onboarding_step = 'complete' 
WHERE onboarding_step IS NULL OR onboarding_step = 'email_verification';
