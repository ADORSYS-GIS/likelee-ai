-- Migration: Add RLS policies for team member access to agency settings
-- This allows team members to access the organization's settings via their membership

BEGIN;

-- Create a helper function to check if a user is a team member (including owner) of an agency
CREATE OR REPLACE FUNCTION public.is_agency_team_member(check_agency_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- User is the owner (agency_id matches their user ID)
    SELECT 1 FROM public.agencies WHERE id = check_agency_id AND id = auth.uid()
    UNION
    -- User is an active team member
    SELECT 1 FROM public.organization_memberships
    WHERE organization_type = 'agency'
      AND organization_id = check_agency_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Create a similar function for brands
CREATE OR REPLACE FUNCTION public.is_brand_team_member(check_brand_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- User is the owner (brand_id matches their user ID)
    SELECT 1 FROM public.brands WHERE id = check_brand_id AND id = auth.uid()
    UNION
    -- User is an active team member
    SELECT 1 FROM public.organization_memberships
    WHERE organization_type = 'brand'
      AND organization_id = check_brand_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- ============================================================================
-- agencies: Update policies for team member access
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own agency profile" ON public.agencies;
CREATE POLICY "Users can view their own agency profile" ON public.agencies
  FOR SELECT USING (public.is_agency_team_member(id));

DROP POLICY IF EXISTS "Users can update their own agency profile" ON public.agencies;
CREATE POLICY "Users can update their own agency profile" ON public.agencies
  FOR UPDATE USING (public.is_agency_team_member(id));

-- ============================================================================
-- brands: Update policies for team member access
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own brand profile" ON public.brands;
CREATE POLICY "Users can view their own brand profile" ON public.brands
  FOR SELECT USING (public.is_brand_team_member(id));

DROP POLICY IF EXISTS "Users can update their own brand profile" ON public.brands;
CREATE POLICY "Users can update their own brand profile" ON public.brands
  FOR UPDATE USING (public.is_brand_team_member(id));

-- ============================================================================
-- agency_notification_settings: Update policies for team member access
-- ============================================================================

DROP POLICY IF EXISTS "agency_notification_settings select own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings select own" ON public.agency_notification_settings
  FOR SELECT USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_notification_settings insert own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings insert own" ON public.agency_notification_settings
  FOR INSERT WITH CHECK (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_notification_settings update own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings update own" ON public.agency_notification_settings
  FOR UPDATE USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_notification_settings delete own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings delete own" ON public.agency_notification_settings
  FOR DELETE USING (public.is_agency_team_member(agency_id));

-- ============================================================================
-- agency_tax_currency_settings: Update policies for team member access
-- ============================================================================

DROP POLICY IF EXISTS "agency_tax_currency_settings select own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings select own" ON public.agency_tax_currency_settings
  FOR SELECT USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_tax_currency_settings insert own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings insert own" ON public.agency_tax_currency_settings
  FOR INSERT WITH CHECK (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_tax_currency_settings update own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings update own" ON public.agency_tax_currency_settings
  FOR UPDATE USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_tax_currency_settings delete own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings delete own" ON public.agency_tax_currency_settings
  FOR DELETE USING (public.is_agency_team_member(agency_id));

-- ============================================================================
-- agency_email_templates: Update policies for team member access
-- ============================================================================

DROP POLICY IF EXISTS "agency_email_templates select own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates select own" ON public.agency_email_templates
  FOR SELECT USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_email_templates insert own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates insert own" ON public.agency_email_templates
  FOR INSERT WITH CHECK (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_email_templates update own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates update own" ON public.agency_email_templates
  FOR UPDATE USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_email_templates delete own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates delete own" ON public.agency_email_templates
  FOR DELETE USING (public.is_agency_team_member(agency_id));

-- ============================================================================
-- agency_commission_settings: Update policies for team member access
-- ============================================================================

DROP POLICY IF EXISTS "agency_commission_settings select own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings select own" ON public.agency_commission_settings
  FOR SELECT USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_commission_settings insert own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings insert own" ON public.agency_commission_settings
  FOR INSERT WITH CHECK (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_commission_settings update own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings update own" ON public.agency_commission_settings
  FOR UPDATE USING (public.is_agency_team_member(agency_id));

DROP POLICY IF EXISTS "agency_commission_settings delete own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings delete own" ON public.agency_commission_settings
  FOR DELETE USING (public.is_agency_team_member(agency_id));

COMMIT;

-- ============================================================================
-- agency_veriff_sessions: Update policies for team member access
-- ============================================================================

DROP POLICY IF EXISTS "agency_veriff_sessions select own" ON public.agency_veriff_sessions;
CREATE POLICY "agency_veriff_sessions select own" ON public.agency_veriff_sessions
  FOR SELECT USING (public.is_agency_team_member(agency_id));

-- No INSERT policy needed - sessions are created via backend with service role
