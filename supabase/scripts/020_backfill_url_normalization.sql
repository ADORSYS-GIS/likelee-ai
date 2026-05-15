BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_applications' AND column_name = 'portfolio_url') THEN
    UPDATE public.job_applications
    SET portfolio_url = 'https://' || portfolio_url
    WHERE portfolio_url IS NOT NULL AND portfolio_url != '' AND portfolio_url NOT LIKE 'http%';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_applications' AND column_name = 'linkedin_link') THEN
    UPDATE public.job_applications
    SET linkedin_link = 'https://' || linkedin_link
    WHERE linkedin_link IS NOT NULL AND linkedin_link != '' AND linkedin_link NOT LIKE 'http%';
  END IF;
END $$;
COMMIT;
