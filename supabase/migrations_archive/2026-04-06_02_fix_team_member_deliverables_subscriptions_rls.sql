-- Migration: Fix RLS policies for campaign offers and subscriptions
-- to allow team members with appropriate permissions to access these resources
--
-- Issues being fixed:
-- 1. Project managers cannot approve brand offers due to RLS blocking deliverable updates
-- 2. Admin/Owner team members cannot update subscriptions due to RLS blocking subscription access
-- 3. Team members cannot access campaign offers, contracts, packages, and deliverables
--
-- All these tables had RLS policies checking auth.uid() = brand_id/agency_id
-- which fails for team members who have their own user IDs.
-- The fix is to use is_brand_team_member() and is_agency_team_member() helper functions.

BEGIN;

-- ============================================================================
-- brand_campaigns: Update policies for team member access
-- ============================================================================

-- Brands can view their campaigns (any team member)
DROP POLICY IF EXISTS "Brands can view own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can view own campaigns"
  ON public.brand_campaigns FOR SELECT
  USING (public.is_brand_team_member(brand_id));

-- Brands can create campaigns (any team member)
-- Permission checking (CreateCampaigns) is done at the application level
DROP POLICY IF EXISTS "Brands can create own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can create own campaigns"
  ON public.brand_campaigns FOR INSERT
  WITH CHECK (public.is_brand_team_member(brand_id));

-- Brands can update campaigns (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Brands can update own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can update own campaigns"
  ON public.brand_campaigns FOR UPDATE
  USING (public.is_brand_team_member(brand_id))
  WITH CHECK (public.is_brand_team_member(brand_id));

-- ============================================================================
-- campaign_offers: Update policies for team member access
-- ============================================================================

-- Brands can view their campaign offers (any team member)
DROP POLICY IF EXISTS "Brands can view own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can view own campaign offers"
  ON public.campaign_offers FOR SELECT
  USING (public.is_brand_team_member(brand_id));

-- Brands can create campaign offers (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Brands can create own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can create own campaign offers"
  ON public.campaign_offers FOR INSERT
  WITH CHECK (public.is_brand_team_member(brand_id));

-- Brands can update campaign offers (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Brands can update own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can update own campaign offers"
  ON public.campaign_offers FOR UPDATE
  USING (public.is_brand_team_member(brand_id))
  WITH CHECK (public.is_brand_team_member(brand_id));

-- Agencies can view agency-targeted offers (any team member)
DROP POLICY IF EXISTS "Agencies can view agency-targeted offers" ON public.campaign_offers;
CREATE POLICY "Agencies can view agency-targeted offers"
  ON public.campaign_offers FOR SELECT
  USING (target_type = 'agency' AND public.is_agency_team_member(target_id));

-- Creators can still view creator-targeted offers
DROP POLICY IF EXISTS "Creators can view creator-targeted offers" ON public.campaign_offers;
CREATE POLICY "Creators can view creator-targeted offers"
  ON public.campaign_offers FOR SELECT
  USING (target_type = 'creator' AND target_id = auth.uid());

-- ============================================================================
-- campaign_offer_contracts: Update policies for team member access
-- ============================================================================

-- Brands can read offer contracts (any team member)
DROP POLICY IF EXISTS "Brands can read own offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Brands can read own offer contracts"
  ON public.campaign_offer_contracts FOR SELECT
  USING (public.is_brand_team_member(brand_id));

-- Brands can manage offer contracts (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Brands can manage own offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Brands can manage own offer contracts"
  ON public.campaign_offer_contracts FOR ALL
  USING (public.is_brand_team_member(brand_id))
  WITH CHECK (public.is_brand_team_member(brand_id));

-- Agencies can read targeted offer contracts (any team member)
DROP POLICY IF EXISTS "Agencies can read targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Agencies can read targeted offer contracts"
  ON public.campaign_offer_contracts FOR SELECT
  USING (target_type = 'agency' AND public.is_agency_team_member(target_id));

-- Agencies can manage targeted offer contracts (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Agencies can manage targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Agencies can manage targeted offer contracts"
  ON public.campaign_offer_contracts FOR ALL
  USING (target_type = 'agency' AND public.is_agency_team_member(target_id))
  WITH CHECK (target_type = 'agency' AND public.is_agency_team_member(target_id));

-- Creators can still read targeted offer contracts
DROP POLICY IF EXISTS "Creators can read targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Creators can read targeted offer contracts"
  ON public.campaign_offer_contracts FOR SELECT
  USING (target_type = 'creator' AND target_id = auth.uid());

-- ============================================================================
-- campaign_offer_packages: Update policies for team member access
-- ============================================================================

-- Brands can read packages (any team member)
DROP POLICY IF EXISTS "Brands can read own packages" ON public.campaign_offer_packages;
CREATE POLICY "Brands can read own packages"
  ON public.campaign_offer_packages FOR SELECT
  USING (public.is_brand_team_member(brand_id));

-- Brands can update packages (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Brands can update own packages" ON public.campaign_offer_packages;
CREATE POLICY "Brands can update own packages"
  ON public.campaign_offer_packages FOR UPDATE
  USING (public.is_brand_team_member(brand_id))
  WITH CHECK (public.is_brand_team_member(brand_id));

-- Agencies can read packages (any team member)
DROP POLICY IF EXISTS "Agencies can read own packages" ON public.campaign_offer_packages;
CREATE POLICY "Agencies can read own packages"
  ON public.campaign_offer_packages FOR SELECT
  USING (public.is_agency_team_member(agency_id));

-- Agencies can manage packages (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Agencies can manage own packages" ON public.campaign_offer_packages;
CREATE POLICY "Agencies can manage own packages"
  ON public.campaign_offer_packages FOR ALL
  USING (public.is_agency_team_member(agency_id))
  WITH CHECK (public.is_agency_team_member(agency_id));

-- ============================================================================
-- campaign_offer_deliverables: Update policies for team member access
-- ============================================================================

-- Brands can read deliverables (any team member)
DROP POLICY IF EXISTS "Brands can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Brands can read own deliverables"
  ON public.campaign_offer_deliverables FOR SELECT
  USING (public.is_brand_team_member(brand_id));

-- Brands can update deliverables (any team member with update permissions)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Brands can update own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Brands can update own deliverables"
  ON public.campaign_offer_deliverables FOR UPDATE
  USING (public.is_brand_team_member(brand_id))
  WITH CHECK (public.is_brand_team_member(brand_id));

-- Agencies can read deliverables (any team member)
DROP POLICY IF EXISTS "Agencies can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Agencies can read own deliverables"
  ON public.campaign_offer_deliverables FOR SELECT
  USING (public.is_agency_team_member(agency_id));

-- Agencies can manage all deliverable operations (any team member)
-- Permission checking is done at the application level
DROP POLICY IF EXISTS "Agencies can manage own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Agencies can manage own deliverables"
  ON public.campaign_offer_deliverables FOR ALL
  USING (public.is_agency_team_member(agency_id))
  WITH CHECK (public.is_agency_team_member(agency_id));

-- Creators can still read and create their own deliverables
DROP POLICY IF EXISTS "Creators can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Creators can read own deliverables"
  ON public.campaign_offer_deliverables FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can create own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Creators can create own deliverables"
  ON public.campaign_offer_deliverables FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- ============================================================================
-- agency_subscriptions: Update policies for team member access
-- ============================================================================

-- Allow any agency team member to view subscriptions
-- Application-level permission checks (ManageBilling) determine who can modify
DROP POLICY IF EXISTS "agency_subscriptions select own" ON public.agency_subscriptions;
CREATE POLICY "agency_subscriptions select own" ON public.agency_subscriptions
  FOR SELECT USING (public.is_agency_team_member(agency_id));

-- Allow team members to insert subscriptions (backend creates these)
DROP POLICY IF EXISTS "agency_subscriptions insert own" ON public.agency_subscriptions;
CREATE POLICY "agency_subscriptions insert own" ON public.agency_subscriptions
  FOR INSERT WITH CHECK (public.is_agency_team_member(agency_id));

-- Allow team members to update subscriptions (backend manages these)
DROP POLICY IF EXISTS "agency_subscriptions update own" ON public.agency_subscriptions;
CREATE POLICY "agency_subscriptions update own" ON public.agency_subscriptions
  FOR UPDATE USING (public.is_agency_team_member(agency_id));

COMMIT;
