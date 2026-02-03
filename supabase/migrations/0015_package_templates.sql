-- Migration: Add Package Template Support
-- This migration adds the ability to create reusable package templates
-- that can be sent to multiple clients without requiring client details upfront.

-- Add template support columns
ALTER TABLE public.agency_talent_packages
ADD COLUMN is_template boolean DEFAULT false NOT NULL,
ADD COLUMN template_id uuid REFERENCES public.agency_talent_packages(id) ON DELETE SET NULL;

-- Make client fields optional for templates
ALTER TABLE public.agency_talent_packages
ALTER COLUMN client_name DROP NOT NULL,
ALTER COLUMN client_email DROP NOT NULL;

-- Add index for faster template queries
CREATE INDEX idx_packages_is_template ON public.agency_talent_packages(agency_id, is_template);
CREATE INDEX idx_packages_template_id ON public.agency_talent_packages(template_id) WHERE template_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.agency_talent_packages.is_template IS 'True if this is a reusable template (Steps 1-3 only), false if sent to a client';
COMMENT ON COLUMN public.agency_talent_packages.template_id IS 'Reference to the template this package was created from (if applicable)';

-- Update RLS policies to ensure templates are only visible to owning agency
-- (Existing policies already handle this via agency_id check, no changes needed)
