-- Fix missing agency_percent in campaigns table

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS agency_percent numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS talent_percent numeric(5,2) NOT NULL DEFAULT 100;

-- Add check constraint for percentages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'campaigns'
        AND constraint_name = 'campaigns_agency_percent_check'
    ) THEN
        ALTER TABLE public.campaigns
        ADD CONSTRAINT campaigns_agency_percent_check
        CHECK (agency_percent >= 0 AND agency_percent <= 100);
    END IF;
END $$;

-- Add check constraint for sum of percentages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'campaigns'
        AND constraint_name = 'campaigns_percent_sum_check'
    ) THEN
        ALTER TABLE public.campaigns
        ADD CONSTRAINT campaigns_percent_sum_check
        CHECK ((agency_percent + talent_percent) = 100);
    END IF;
END $$;
