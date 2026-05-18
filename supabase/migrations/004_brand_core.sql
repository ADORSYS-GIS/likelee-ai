-- 004_brand_core.sql
-- NOTE: FK for brand_license_requests.submission_id deferred to 018_fk_fixups.sql
-- Consolidated migration for all brand-related schema
-- Source files: 0001_core_profiles (brands), 0003_assets_storage_moderation (brand_licenses, brand_voice_*),
-- 2026-03-27_kyc_rejection_details, 2026-03-31_brand_billing_subscriptions, 2026-04-09_brand_notifications,
-- 2026-04-13_01_agency_studio_addon, 2026-04-14_02_brand_studio_addon_activated_at,
-- 2026-04-17_brand_budget_alerts, 2026-04-21_brand_payment_methods, 2026-04-21_brand_storage,
-- 2026-04-23_brand_asset_library, 2026-03-04_brand_connections, 2026-03-06_brand_campaigns_offers_v2,
-- 2026-03-06_brand_campaigns_phase2_workflow, 2026-03-17_brand_campaigns_mark_done,
-- 2026-03-18_brand_activity_events_extend, 2026-03-19_brand_activity_events_rls_refinement,
-- 2026-03-21_brand_license_requests_consolidated, 2026-03-10_offer_talent_assignments_and_requests,
-- 2026-03-10_job_postings.sql, 2026-03-13_application_fields.sql
--
-- FIXED (2026-05-18): Added missing columns per PR review:
-- brands: plan_interval, plan_updated_at, studio_addon_status, notification_prefs,
--        monthly_budget_limit, budget_alert_80_sent_at, budget_alert_100_sent_at
-- ADDED: job_postings and job_applications tables (brand-creator job board) from 2026-03-10

BEGIN;

-- ============================================================================
-- 1. BRANDS TABLE (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core fields
    company_name text NOT NULL,
    contact_name text,
    contact_title text,
    email text NOT NULL,
    website text,
    phone_number text,
    industry text,
    
    -- Business details
    primary_goal jsonb,
    geographic_target text,
    provide_creators text,
    production_type text,
    budget_range text,
    creates_for text,
    uses_ai text,
    roles_needed jsonb,
    
    -- Status
    status text DEFAULT 'waitlist',
    onboarding_step text DEFAULT 'email_verification',
    
    -- Verification (KYC)
    kyc_status text DEFAULT 'not_started',
    liveness_status text DEFAULT 'not_started',
    kyc_provider text,
    kyc_session_id text,
    verified_at timestamptz,
    kyc_rejection_reason text,
    kyc_rejection_code text,
    
    -- Branding
    logo_url text,
    
    -- Billing & Subscriptions
    plan_tier text,
    plan_interval text DEFAULT 'month',
    stripe_customer_id text,
    stripe_subscription_id text,
    subscription_status text,
    subscription_tier text,
    subscription_current_period_end timestamptz,
    subscription_cancel_at_period_end boolean DEFAULT false,
    subscription_trial_end timestamptz,
    plan_updated_at timestamptz,
    
    -- Payment Methods
    stripe_payment_method_id text,
    payment_method_last_four text,
    payment_method_brand text,
    payment_method_exp_month integer,
    payment_method_exp_year integer,
    payment_method_updated_at timestamptz,
    
    -- Studio Addon
    studio_addon_active boolean DEFAULT false,
    studio_addon_status text DEFAULT 'inactive',
    studio_addon_activated_at timestamptz,
    studio_addon_subscription_id text,
    studio_addon_current_period_end timestamptz,
    studio_addon_cancel_at_period_end boolean DEFAULT false,
    studio_addon_updated_at timestamptz,
    
    -- Notifications (from 2026-04-09_brand_notifications)
    notification_prefs jsonb DEFAULT '{"newProjectAlerts": true, "deliverableSubmissions": true, "approvalReminders": true, "licenseExpirationAlerts": true}'::jsonb,
    
    -- Budget Alerts (from 2026-04-17_brand_budget_alerts)
    monthly_budget_limit numeric DEFAULT NULL,
    budget_alert_threshold_percent integer DEFAULT 80,
    budget_alert_email text,
    budget_alert_enabled boolean DEFAULT false,
    budget_alert_80_sent_at timestamptz,
    budget_alert_100_sent_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Brands indexes
CREATE INDEX IF NOT EXISTS idx_brands_email ON public.brands(email);
CREATE INDEX IF NOT EXISTS idx_brands_stripe_customer_id ON public.brands(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_brands_studio_addon_active ON public.brands(studio_addon_active);

-- Brands RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brand profile" ON public.brands;
CREATE POLICY "Users can view their own brand profile" ON public.brands
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own brand profile" ON public.brands;
CREATE POLICY "Users can update their own brand profile" ON public.brands
    FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 2. BRAND PAYMENT METHODS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    stripe_payment_method_id text NOT NULL,
    card_last_four text NOT NULL,
    card_brand text NOT NULL,
    card_exp_month integer NOT NULL,
    card_exp_year integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_brand_payment_methods_brand_id ON public.brand_payment_methods(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_payment_methods_stripe_id ON public.brand_payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_brand_payment_methods_active ON public.brand_payment_methods(brand_id, is_active);

ALTER TABLE public.brand_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can view their own payment methods"
    ON public.brand_payment_methods FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can insert their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can insert their own payment methods"
    ON public.brand_payment_methods FOR INSERT
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can update their own payment methods"
    ON public.brand_payment_methods FOR UPDATE
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can delete their own payment methods" ON public.brand_payment_methods;
CREATE POLICY "Brands can delete their own payment methods"
    ON public.brand_payment_methods FOR DELETE
    USING (brand_id = auth.uid());

-- ============================================================================
-- 3. BRAND STORAGE SETTINGS & FILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_storage_settings (
    brand_id uuid PRIMARY KEY REFERENCES public.brands(id) ON DELETE CASCADE,
    storage_limit_bytes bigint NOT NULL DEFAULT 5368709120,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_storage_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_storage_settings select own" ON public.brand_storage_settings;
CREATE POLICY "brand_storage_settings select own" ON public.brand_storage_settings
    FOR SELECT USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_storage_settings insert own" ON public.brand_storage_settings;
CREATE POLICY "brand_storage_settings insert own" ON public.brand_storage_settings
    FOR INSERT WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_storage_settings update own" ON public.brand_storage_settings;
CREATE POLICY "brand_storage_settings update own" ON public.brand_storage_settings
    FOR UPDATE USING (brand_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.brand_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES public.brand_folders(id) ON DELETE CASCADE,
    name text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_folders_brand_id ON public.brand_folders(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_folders_parent_id ON public.brand_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_brand_folders_is_default ON public.brand_folders(is_default);

ALTER TABLE public.brand_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_folders select own" ON public.brand_folders;
CREATE POLICY "brand_folders select own" ON public.brand_folders
    FOR SELECT USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_folders insert own" ON public.brand_folders;
CREATE POLICY "brand_folders insert own" ON public.brand_folders
    FOR INSERT WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_folders update own" ON public.brand_folders;
CREATE POLICY "brand_folders update own" ON public.brand_folders
    FOR UPDATE USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_folders delete own" ON public.brand_folders;
CREATE POLICY "brand_folders delete own" ON public.brand_folders
    FOR DELETE USING (brand_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.brand_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    folder_id uuid REFERENCES public.brand_folders(id) ON DELETE SET NULL,
    file_name text NOT NULL,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    size_bytes bigint NOT NULL DEFAULT 0,
    mime_type text,
    source_type text DEFAULT 'upload' CHECK (source_type IN ('upload', 'studio_generation', 'external')),
    generation_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_files_brand_id ON public.brand_files(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_files_folder_id ON public.brand_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_brand_files_source_type ON public.brand_files(source_type);
CREATE INDEX IF NOT EXISTS idx_brand_files_generation_id ON public.brand_files(generation_id);

ALTER TABLE public.brand_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_files select own" ON public.brand_files;
CREATE POLICY "brand_files select own" ON public.brand_files
    FOR SELECT USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_files insert own" ON public.brand_files;
CREATE POLICY "brand_files insert own" ON public.brand_files
    FOR INSERT WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_files update own" ON public.brand_files;
CREATE POLICY "brand_files update own" ON public.brand_files
    FOR UPDATE USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "brand_files delete own" ON public.brand_files;
CREATE POLICY "brand_files delete own" ON public.brand_files
    FOR DELETE USING (brand_id = auth.uid());

-- ============================================================================
-- 4. BRAND LICENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_licenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_org_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    face_user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    type text,
    status text NOT NULL DEFAULT 'active',
    compliance_status text NOT NULL DEFAULT 'none' CHECK (compliance_status IN ('none', 'issue', 'resolved')),
    start_at timestamptz,
    end_at timestamptz,
    updated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_licenses_brand ON public.brand_licenses(brand_org_id);
CREATE INDEX IF NOT EXISTS idx_brand_licenses_face ON public.brand_licenses(face_user_id);
CREATE INDEX IF NOT EXISTS idx_brand_licenses_agency ON public.brand_licenses(agency_id);
CREATE INDEX IF NOT EXISTS idx_brand_licenses_talent ON public.brand_licenses(talent_id);

ALTER TABLE public.brand_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand members select licenses" ON public.brand_licenses;
CREATE POLICY "brand members select licenses" ON public.brand_licenses FOR SELECT
    USING (brand_org_id = auth.uid());

-- ============================================================================
-- 5. BRAND VOICE FOLDERS & ASSETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_voice_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_org_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    face_user_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    license_id uuid NOT NULL REFERENCES public.brand_licenses(id) ON DELETE CASCADE,
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (brand_org_id, face_user_id, license_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_folders_brand ON public.brand_voice_folders(brand_org_id);

ALTER TABLE public.brand_voice_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand members select folders" ON public.brand_voice_folders;
CREATE POLICY "brand members select folders" ON public.brand_voice_folders FOR SELECT
    USING (brand_org_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.brand_voice_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id uuid NOT NULL REFERENCES public.brand_voice_folders(id) ON DELETE CASCADE,
    asset_type text NOT NULL,
    recording_id uuid REFERENCES public.voice_recordings(id) ON DELETE SET NULL,
    model_id uuid REFERENCES public.voice_models(id) ON DELETE SET NULL,
    storage_bucket text,
    storage_path text,
    public_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_voice_assets_folder ON public.brand_voice_assets(folder_id);

ALTER TABLE public.brand_voice_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand members select assets" ON public.brand_voice_assets;
CREATE POLICY "brand members select assets" ON public.brand_voice_assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.brand_voice_folders
            WHERE id = folder_id AND brand_org_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. BRAND CONNECTIONS (Agency & Creator)
-- ============================================================================

-- Brand -> Agency connection requests
CREATE TABLE IF NOT EXISTS public.brand_agency_connection_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_agency_connection_requests_brand_id ON public.brand_agency_connection_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connection_requests_agency_id ON public.brand_agency_connection_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connection_requests_status ON public.brand_agency_connection_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_brand_agency_connection_requests_pending ON public.brand_agency_connection_requests(brand_id, agency_id) WHERE status = 'pending';

ALTER TABLE public.brand_agency_connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view their agency connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Brands can view their agency connection requests"
    ON public.brand_agency_connection_requests FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view brand connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Agencies can view brand connection requests"
    ON public.brand_agency_connection_requests FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create agency connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Brands can create agency connection requests"
    ON public.brand_agency_connection_requests FOR INSERT
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can respond to pending brand connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Agencies can respond to pending brand connection requests"
    ON public.brand_agency_connection_requests FOR UPDATE
    USING (agency_id = auth.uid() AND status = 'pending')
    WITH CHECK (agency_id = auth.uid() AND status IN ('accepted', 'declined'));

-- Persistent brand-agency connections
CREATE TABLE IF NOT EXISTS public.brand_agency_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
    connected_at timestamptz NOT NULL DEFAULT now(),
    disconnected_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (brand_id, agency_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_agency_connections_brand_id ON public.brand_agency_connections(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connections_agency_id ON public.brand_agency_connections(agency_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connections_status ON public.brand_agency_connections(status);

ALTER TABLE public.brand_agency_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view their agency connections" ON public.brand_agency_connections;
CREATE POLICY "Brands can view their agency connections"
    ON public.brand_agency_connections FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view their brand connections" ON public.brand_agency_connections;
CREATE POLICY "Agencies can view their brand connections"
    ON public.brand_agency_connections FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Brands can disconnect agency connections" ON public.brand_agency_connections;
CREATE POLICY "Brands can disconnect agency connections"
    ON public.brand_agency_connections FOR UPDATE
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can disconnect brand connections" ON public.brand_agency_connections;
CREATE POLICY "Agencies can disconnect brand connections"
    ON public.brand_agency_connections FOR UPDATE
    USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

-- Brand -> Creator connection requests
CREATE TABLE IF NOT EXISTS public.brand_creator_connection_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_creator_connection_requests_brand_id ON public.brand_creator_connection_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connection_requests_creator_id ON public.brand_creator_connection_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connection_requests_status ON public.brand_creator_connection_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_brand_creator_connection_requests_pending ON public.brand_creator_connection_requests(brand_id, creator_id) WHERE status = 'pending';

ALTER TABLE public.brand_creator_connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view their creator connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Brands can view their creator connection requests"
    ON public.brand_creator_connection_requests FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view brand connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Creators can view brand connection requests"
    ON public.brand_creator_connection_requests FOR SELECT
    USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create creator connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Brands can create creator connection requests"
    ON public.brand_creator_connection_requests FOR INSERT
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can respond to pending brand connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Creators can respond to pending brand connection requests"
    ON public.brand_creator_connection_requests FOR UPDATE
    USING (creator_id = auth.uid() AND status = 'pending')
    WITH CHECK (creator_id = auth.uid() AND status IN ('accepted', 'declined'));

-- Persistent brand-creator connections
CREATE TABLE IF NOT EXISTS public.brand_creator_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
    connected_at timestamptz NOT NULL DEFAULT now(),
    disconnected_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (brand_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_creator_connections_brand_id ON public.brand_creator_connections(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connections_creator_id ON public.brand_creator_connections(creator_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connections_status ON public.brand_creator_connections(status);

ALTER TABLE public.brand_creator_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view creator connections" ON public.brand_creator_connections;
CREATE POLICY "Brands can view creator connections"
    ON public.brand_creator_connections FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view brand connections" ON public.brand_creator_connections;
CREATE POLICY "Creators can view brand connections"
    ON public.brand_creator_connections FOR SELECT
    USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update creator connections" ON public.brand_creator_connections;
CREATE POLICY "Brands can update creator connections"
    ON public.brand_creator_connections FOR UPDATE
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update brand connections" ON public.brand_creator_connections;
CREATE POLICY "Creators can update brand connections"
    ON public.brand_creator_connections FOR UPDATE
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- ============================================================================
-- 7. BRAND CAMPAIGNS & OFFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    name text NOT NULL,
    objective text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    usage_scope text,
    duration_days integer,
    territory text,
    exclusivity text,
    budget_range text NOT NULL,
    start_date date NOT NULL,
    custom_terms text,
    brief_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    completed_at timestamptz,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_campaigns_brand_created ON public.brand_campaigns(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_campaigns_brand_status_start ON public.brand_campaigns(brand_id, status, start_date DESC);

ALTER TABLE public.brand_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can view own campaigns"
    ON public.brand_campaigns FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can create own campaigns"
    ON public.brand_campaigns FOR INSERT
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own campaigns" ON public.brand_campaigns;
CREATE POLICY "Brands can update own campaigns"
    ON public.brand_campaigns FOR UPDATE
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.campaign_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    target_type text NOT NULL CHECK (target_type IN ('creator', 'agency')),
    target_id uuid NOT NULL,
    status text NOT NULL CHECK (
        status IN (
            'draft', 'sent', 'viewed', 'accepted', 'declined', 'contract_pending',
            'contract_sent', 'contract_partially_signed', 'contract_fully_signed',
            'in_execution', 'deliverables_submitted', 'in_review', 'changes_requested',
            'approved', 'completed', 'expired', 'cancelled'
        )
    ),
    offer_title text,
    message text,
    expires_at timestamptz,
    decided_at timestamptz,
    brief_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    budget_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Payment/escrow fields
    billing_request_id uuid,
    payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'processing')),
    escrow_status text NOT NULL DEFAULT 'holding' CHECK (escrow_status IN ('holding', 'releasing', 'released')),
    escrow_released_at timestamptz,
    paid_at timestamptz,
    -- Dismissal tracking
    dismissed_by_brand boolean DEFAULT false,
    dismissed_at timestamptz,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offers_campaign_created ON public.campaign_offers(brand_campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offers_brand_status_created ON public.campaign_offers(brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offers_target_status ON public.campaign_offers(target_type, target_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_offers_active_target ON public.campaign_offers(brand_campaign_id, target_type, target_id)
    WHERE status NOT IN ('declined', 'cancelled', 'expired', 'completed');

ALTER TABLE public.campaign_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can view own campaign offers"
    ON public.campaign_offers FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can create own campaign offers"
    ON public.campaign_offers FOR INSERT
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own campaign offers" ON public.campaign_offers;
CREATE POLICY "Brands can update own campaign offers"
    ON public.campaign_offers FOR UPDATE
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view agency-targeted offers" ON public.campaign_offers;
CREATE POLICY "Agencies can view agency-targeted offers"
    ON public.campaign_offers FOR SELECT
    USING (target_type = 'agency' AND target_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view creator-targeted offers" ON public.campaign_offers;
CREATE POLICY "Creators can view creator-targeted offers"
    ON public.campaign_offers FOR SELECT
    USING (target_type = 'creator' AND target_id = auth.uid());

-- ============================================================================
-- 8. CAMPAIGN OFFER CONTRACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_offer_contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
    brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    target_type text NOT NULL CHECK (target_type IN ('creator', 'agency')),
    target_id uuid NOT NULL,
    owner_role text NOT NULL CHECK (owner_role IN ('brand', 'agency')),
    title text,
    file_url text,
    docuseal_submission_id bigint,
    docuseal_template_id bigint,
    docuseal_slug text,
    docuseal_status text NOT NULL DEFAULT 'draft',
    sent_at timestamptz,
    last_synced_at timestamptz,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offer_contracts_offer_created ON public.campaign_offer_contracts(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_contracts_brand_created ON public.campaign_offer_contracts(brand_id, created_at DESC);

ALTER TABLE public.campaign_offer_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can read own offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Brands can read own offer contracts"
    ON public.campaign_offer_contracts FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can manage own offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Brands can manage own offer contracts"
    ON public.campaign_offer_contracts FOR ALL
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can read targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Agencies can read targeted offer contracts"
    ON public.campaign_offer_contracts FOR SELECT
    USING (target_type = 'agency' AND target_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Agencies can manage targeted offer contracts"
    ON public.campaign_offer_contracts FOR ALL
    USING (target_type = 'agency' AND target_id = auth.uid())
    WITH CHECK (target_type = 'agency' AND target_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read targeted offer contracts" ON public.campaign_offer_contracts;
CREATE POLICY "Creators can read targeted offer contracts"
    ON public.campaign_offer_contracts FOR SELECT
    USING (target_type = 'creator' AND target_id = auth.uid());

-- ============================================================================
-- 9. CAMPAIGN OFFER PACKAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_offer_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
    brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'feedback_received', 'expired', 'cancelled')),
    title text,
    message text,
    package_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    expires_at timestamptz,
    sent_at timestamptz,
    decided_at timestamptz,
    dismissed_by_brand boolean DEFAULT false,
    dismissed_at timestamptz,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offer_packages_offer_created ON public.campaign_offer_packages(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_packages_brand_status ON public.campaign_offer_packages(brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_packages_agency_status ON public.campaign_offer_packages(agency_id, status, created_at DESC);

ALTER TABLE public.campaign_offer_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can read own packages" ON public.campaign_offer_packages;
CREATE POLICY "Brands can read own packages"
    ON public.campaign_offer_packages FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own packages" ON public.campaign_offer_packages;
CREATE POLICY "Brands can update own packages"
    ON public.campaign_offer_packages FOR UPDATE
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can read own packages" ON public.campaign_offer_packages;
CREATE POLICY "Agencies can read own packages"
    ON public.campaign_offer_packages FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own packages" ON public.campaign_offer_packages;
CREATE POLICY "Agencies can manage own packages"
    ON public.campaign_offer_packages FOR ALL
    USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

-- ============================================================================
-- 10. CAMPAIGN OFFER DELIVERABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_offer_deliverables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
    brand_campaign_id uuid NOT NULL REFERENCES public.brand_campaigns(id) ON DELETE CASCADE,
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    submitted_by uuid NOT NULL,
    submitted_by_role text NOT NULL DEFAULT 'creator' CHECK (submitted_by_role IN ('agency', 'creator')),
    asset_request_id uuid,
    asset_url text NOT NULL,
    asset_type text NOT NULL DEFAULT 'file',
    caption text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'agency_review', 'brand_review', 'brand_approved', 'changes_requested', 'approved', 'rejected')),
    agency_review_note text,
    brand_review_note text,
    reviewed_by_agency_at timestamptz,
    reviewed_by_brand_at timestamptz,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_offer_created ON public.campaign_offer_deliverables(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_brand_status ON public.campaign_offer_deliverables(brand_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_agency_status ON public.campaign_offer_deliverables(agency_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_creator_status ON public.campaign_offer_deliverables(creator_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_talent ON public.campaign_offer_deliverables(talent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_offer_deliverables_request ON public.campaign_offer_deliverables(asset_request_id, created_at DESC);

ALTER TABLE public.campaign_offer_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Brands can read own deliverables"
    ON public.campaign_offer_deliverables FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Brands can update own deliverables"
    ON public.campaign_offer_deliverables FOR UPDATE
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Agencies can read own deliverables"
    ON public.campaign_offer_deliverables FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Agencies can manage own deliverables"
    ON public.campaign_offer_deliverables FOR ALL
    USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read own deliverables" ON public.campaign_offer_deliverables;
CREATE POLICY "Creators can read own deliverables"
    ON public.campaign_offer_deliverables FOR SELECT
    USING (creator_id = auth.uid());

-- ============================================================================
-- 11. OFFER TALENT ASSIGNMENTS & ASSET REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.offer_talent_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'removed')),
    assigned_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    assigned_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT offer_talent_assignments_creator_required CHECK (creator_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_talent_assignments_offer_creator ON public.offer_talent_assignments(offer_id, creator_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_talent_assignments_offer_talent ON public.offer_talent_assignments(offer_id, talent_id) WHERE talent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offer_talent_assignments_offer ON public.offer_talent_assignments(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_talent_assignments_agency ON public.offer_talent_assignments(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_talent_assignments_creator ON public.offer_talent_assignments(creator_id, created_at DESC);

ALTER TABLE public.offer_talent_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can read offer talent assignments" ON public.offer_talent_assignments;
CREATE POLICY "Agencies can read offer talent assignments"
    ON public.offer_talent_assignments FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage offer talent assignments" ON public.offer_talent_assignments;
CREATE POLICY "Agencies can manage offer talent assignments"
    ON public.offer_talent_assignments FOR ALL
    USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read their offer talent assignments" ON public.offer_talent_assignments;
CREATE POLICY "Creators can read their offer talent assignments"
    ON public.offer_talent_assignments FOR SELECT
    USING (creator_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.offer_asset_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    title text,
    message text,
    file_url text,
    status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'fulfilled', 'cancelled')),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT offer_asset_requests_creator_required CHECK (creator_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_offer_asset_requests_offer ON public.offer_asset_requests(offer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_asset_requests_agency ON public.offer_asset_requests(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_asset_requests_creator ON public.offer_asset_requests(creator_id, created_at DESC);

ALTER TABLE public.offer_asset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can read offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Agencies can read offer asset requests"
    ON public.offer_asset_requests FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Agencies can manage offer asset requests"
    ON public.offer_asset_requests FOR ALL
    USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Creators can read offer asset requests"
    ON public.offer_asset_requests FOR SELECT
    USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update offer asset requests" ON public.offer_asset_requests;
CREATE POLICY "Creators can update offer asset requests"
    ON public.offer_asset_requests FOR UPDATE
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- Add FK from campaign_offer_deliverables now that offer_asset_requests exists
DO $$ BEGIN
    ALTER TABLE public.campaign_offer_deliverables
        ADD CONSTRAINT fk_deliverables_asset_request
        FOREIGN KEY (asset_request_id) REFERENCES public.offer_asset_requests(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- ============================================================================
-- 12. CAMPAIGN OFFER TRANSFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_offer_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
    recipient_type text NOT NULL CHECK (recipient_type IN ('agency', 'creator')),
    recipient_id uuid NOT NULL,
    stripe_connect_account_id text NOT NULL,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    currency text NOT NULL DEFAULT 'USD',
    stripe_transfer_id text,
    status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'failed', 'pending_retry', 'reversed')),
    failure_reason text,
    retry_count integer NOT NULL DEFAULT 0,
    retried_at timestamptz,
    notified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(offer_id, recipient_type, recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cot_unique_recipient ON public.campaign_offer_transfers(offer_id, recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_cot_offer_id ON public.campaign_offer_transfers(offer_id);
CREATE INDEX IF NOT EXISTS idx_cot_stripe_transfer_id ON public.campaign_offer_transfers(stripe_transfer_id);

ALTER TABLE public.campaign_offer_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view campaign offer transfers" ON public.campaign_offer_transfers;
CREATE POLICY "Agencies can view campaign offer transfers"
    ON public.campaign_offer_transfers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.campaign_offers co
            WHERE co.id = offer_id
                AND co.target_type = 'agency'
                AND co.target_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Creators can view campaign offer transfers" ON public.campaign_offer_transfers;
CREATE POLICY "Creators can view campaign offer transfers"
    ON public.campaign_offer_transfers FOR SELECT
    USING (recipient_type = 'creator' AND recipient_id = auth.uid());

-- ============================================================================
-- 13. BRAND LICENSE REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_license_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    talent_name text,
    campaign_title text,
    description text,
    category text,
    exclusivity text,
    modifications_allowed text,
    custom_terms text,
    territory text,
    usage_scope text,
    license_fee numeric,
    duration_days integer,
    license_start_date date,
    license_end_date date,
    status text NOT NULL DEFAULT 'pending',
    decline_reason text,
    submission_id uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_license_requests_brand ON public.brand_license_requests(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_license_requests_agency ON public.brand_license_requests(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_license_requests_status ON public.brand_license_requests(status);

ALTER TABLE public.brand_license_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own brand license requests" ON public.brand_license_requests;
CREATE POLICY "Brands can view own brand license requests"
    ON public.brand_license_requests FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create own brand license requests" ON public.brand_license_requests;
CREATE POLICY "Brands can create own brand license requests"
    ON public.brand_license_requests FOR INSERT
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view assigned brand license requests" ON public.brand_license_requests;
CREATE POLICY "Agencies can view assigned brand license requests"
    ON public.brand_license_requests FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can update assigned brand license requests" ON public.brand_license_requests;
CREATE POLICY "Agencies can update assigned brand license requests"
    ON public.brand_license_requests FOR UPDATE
    USING (agency_id = auth.uid());

-- ============================================================================
-- 14. BRAND ACTIVITY EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_activity_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    campaign_id uuid REFERENCES public.brand_campaigns(id) ON DELETE SET NULL,
    type text NOT NULL,
    event_type text,
    subject_table text,
    subject_id uuid,
    title text,
    subtitle text,
    description text,
    actor_type text,
    actor_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_activity_events_brand_created ON public.brand_activity_events(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_activity_events_campaign_created ON public.brand_activity_events(campaign_id, created_at DESC);

ALTER TABLE public.brand_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relevant activity events" ON public.brand_activity_events;
CREATE POLICY "Users can view relevant activity events"
    ON public.brand_activity_events FOR SELECT
    USING (
        brand_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.brand_agency_connections 
            WHERE brand_id = public.brand_activity_events.brand_id AND agency_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.brand_creator_connections 
            WHERE brand_id = public.brand_activity_events.brand_id AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Brands can insert own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can insert own activity events"
    ON public.brand_activity_events FOR INSERT
    WITH CHECK (brand_id = auth.uid());

-- ============================================================================
-- 15. BRAND NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brand_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_notifications_brand_created ON public.brand_notifications(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_notifications_brand_read ON public.brand_notifications(brand_id, is_read, created_at DESC);

ALTER TABLE public.brand_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can view own notifications"
    ON public.brand_notifications FOR SELECT
    USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update own notifications" ON public.brand_notifications;
CREATE POLICY "Brands can update own notifications"
    ON public.brand_notifications FOR UPDATE
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

-- ============================================================================
-- 16. UTILITY FUNCTIONS
-- ============================================================================

-- Brand average turnaround hours
CREATE OR REPLACE FUNCTION public.brand_avg_turnaround_hours(
    p_brand_id uuid,
    p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        ROUND(
            AVG(
                EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
            )
        )::integer,
        0
    )
    FROM public.brand_campaigns
    WHERE brand_id = p_brand_id
        AND completed_at IS NOT NULL
        AND completed_at >= start_date::timestamptz
        AND start_date >= date_trunc('month', p_month)::date
        AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

-- Industry average turnaround hours
CREATE OR REPLACE FUNCTION public.industry_avg_turnaround_hours(
    p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        ROUND(
            AVG(
                EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
            )
        )::integer,
        0
    )
    FROM public.brand_campaigns
    WHERE completed_at IS NOT NULL
        AND completed_at >= start_date::timestamptz
        AND start_date >= date_trunc('month', p_month)::date
        AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

-- ============================================================================
-- 17. TRIGGERS
-- ============================================================================

-- Auto-create default folder on brand creation
CREATE OR REPLACE FUNCTION public.create_brand_default_folder()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO brand_folders (brand_id, name, is_default)
    VALUES (NEW.id, 'Studio Generations', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_brand_created ON public.brands;
CREATE TRIGGER on_brand_created
    AFTER INSERT ON public.brands
    FOR EACH ROW EXECUTE FUNCTION public.create_brand_default_folder();

-- ============================================================================
-- 18. VIEWS
-- ============================================================================

-- Brand storage analytics
CREATE OR REPLACE VIEW public.brand_storage_analytics AS
SELECT 
    bf.brand_id,
    bf.source_type,
    bf.mime_type,
    COUNT(*) as file_count,
    SUM(bf.size_bytes) as total_bytes,
    AVG(bf.size_bytes) as avg_file_size
FROM brand_files bf
GROUP BY bf.brand_id, bf.source_type, bf.mime_type;

-- ============================================================================
-- 19. CAMPAIGN OFFER TRANSFER RETRY FUNCTIONS (from 2026-04-22)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_transfer_pending_retry(
    p_offer_id        uuid,
    p_recipient_type  text,
    p_recipient_id    uuid
) RETURNS void AS $$
BEGIN
    UPDATE public.campaign_offer_transfers
    SET
        status      = 'pending_retry',
        retried_at  = now(),
        retry_count = retry_count + 1,
        updated_at  = now()
    WHERE offer_id       = p_offer_id
      AND recipient_type = p_recipient_type
      AND recipient_id   = p_recipient_id
      AND status         = 'failed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_transfer_notified(
    p_offer_id        uuid,
    p_recipient_type  text,
    p_recipient_id    uuid
) RETURNS void AS $$
BEGIN
    UPDATE public.campaign_offer_transfers
    SET
        notified_at = now(),
        updated_at  = now()
    WHERE offer_id       = p_offer_id
      AND recipient_type = p_recipient_type
      AND recipient_id   = p_recipient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 17. JOB POSTINGS (Brand-Creator Job Board)
-- Source: 2026-03-10_job_postings.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_postings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,

    -- Step 1: Basic Information
    job_title text,
    company_name text,
    contact_email text,
    category text,
    call_type text,
    work_types text[],
    status text NOT NULL DEFAULT 'open',

    -- Step 2: Project Overview
    location text,
    job_type text,
    about_role text,
    goals text[],
    deliverables text,
    start_date date,
    end_date date,

    -- Step 3: Talent Requirements
    talent_types text[],
    region text,
    language text,
    required_skills text[],
    needs_licensing boolean,

    -- Step 4: Licensing Details (only when needs_licensing = true)
    usage_type text,
    license_duration text,
    territories text,
    exclusivity boolean,
    royalty_option boolean,

    -- Step 5: Budget & Compensation
    budget numeric,
    payment_type text,
    currency text DEFAULT 'USD',

    -- Step 6: Collaboration Preferences
    work_with_agency boolean,
    invite_creator boolean,
    invited_agency_ids uuid[],
    invited_creator_ids uuid[],
    declined_agency_ids uuid[] DEFAULT '{}',
    declined_creator_ids uuid[] DEFAULT '{}',
    accepted_agency_ids uuid[] DEFAULT '{}',
    accepted_creator_ids uuid[] DEFAULT '{}',
    brand_assets jsonb,
    confidential boolean,

    -- Step 7: Preview & Publish
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT job_postings_call_type_check CHECK (
        status = 'draft' or call_type in ('creator','agency','athlete','ai_artist')
    ),
    CONSTRAINT job_postings_required_fields_check CHECK (
        status = 'draft' or (
            job_title is not null and job_title <> '' and
            about_role is not null and about_role <> '' and
            call_type is not null and call_type <> ''
        )
    ),
    CONSTRAINT job_postings_status_check CHECK (status in ('open','closed','draft'))
);

CREATE INDEX IF NOT EXISTS idx_job_postings_brand_id ON public.job_postings(brand_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON public.job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_call_type ON public.job_postings(call_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON public.job_postings(created_at desc);
CREATE INDEX IF NOT EXISTS idx_job_postings_invited_agency_ids ON public.job_postings USING GIN (invited_agency_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_invited_creator_ids ON public.job_postings USING GIN (invited_creator_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_accepted_agency_ids ON public.job_postings USING GIN (accepted_agency_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_accepted_creator_ids ON public.job_postings USING GIN (accepted_creator_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_declined_agency_ids ON public.job_postings USING GIN (declined_agency_ids);
CREATE INDEX IF NOT EXISTS idx_job_postings_declined_creator_ids ON public.job_postings USING GIN (declined_creator_ids);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_postings_select" ON public.job_postings;
CREATE POLICY "job_postings_select"
    ON public.job_postings
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "job_postings_insert" ON public.job_postings;
CREATE POLICY "job_postings_insert"
    ON public.job_postings
    FOR INSERT
    TO authenticated
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "job_postings_update" ON public.job_postings;
CREATE POLICY "job_postings_update"
    ON public.job_postings
    FOR UPDATE
    TO authenticated
    USING (brand_id = auth.uid())
    WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "job_postings_delete" ON public.job_postings;
CREATE POLICY "job_postings_delete"
    ON public.job_postings
    FOR DELETE
    TO authenticated
    USING (brand_id = auth.uid());

-- ============================================================================
-- 18. JOB APPLICATIONS (Brand-Creator Job Board)
-- Source: 2026-03-10_job_postings.sql, 2026-03-13_application_fields.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    applicant_id uuid NOT NULL,
    applicant_role text NOT NULL,

    message text,
    resume_name text,
    resume_url text,
    resume_path text,
    resume_mime text,
    resume_size bigint,

    -- Social and Portfolio Links (from 2026-03-13)
    portfolio_link text,
    github_link text,
    linkedin_link text,

    -- Comp Card Fields (from 2026-03-13)
    comp_card_name text,
    comp_card_url text,
    comp_card_path text,

    status text NOT NULL DEFAULT 'submitted',

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT job_applications_status_check CHECK (status in ('submitted','shortlisted','rejected','withdrawn'))
);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON public.job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_name ON public.job_applications(resume_name);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_url ON public.job_applications(resume_url);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_path ON public.job_applications(resume_path);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_mime ON public.job_applications(resume_mime);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_size ON public.job_applications(resume_size);
CREATE INDEX IF NOT EXISTS idx_job_applications_portfolio_link ON public.job_applications(portfolio_link);
CREATE INDEX IF NOT EXISTS idx_job_applications_github_link ON public.job_applications(github_link);
CREATE INDEX IF NOT EXISTS idx_job_applications_linkedin_link ON public.job_applications(linkedin_link);
CREATE INDEX IF NOT EXISTS idx_job_applications_comp_card_name ON public.job_applications(comp_card_name);
CREATE INDEX IF NOT EXISTS idx_job_applications_comp_card_url ON public.job_applications(comp_card_url);
CREATE INDEX IF NOT EXISTS idx_job_applications_comp_card_path ON public.job_applications(comp_card_path);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_applications_insert" ON public.job_applications;
CREATE POLICY "job_applications_insert"
    ON public.job_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "job_applications_select" ON public.job_applications;
CREATE POLICY "job_applications_select"
    ON public.job_applications
    FOR SELECT
    TO authenticated
    USING (
        applicant_id = auth.uid()
        or job_id IN (SELECT id FROM public.job_postings WHERE brand_id = auth.uid())
    );

DROP POLICY IF EXISTS "job_applications_update" ON public.job_applications;
CREATE POLICY "job_applications_update"
    ON public.job_applications
    FOR UPDATE
    TO authenticated
    USING (
        job_id IN (SELECT id FROM public.job_postings WHERE brand_id = auth.uid())
    )
    WITH CHECK (
        job_id IN (SELECT id FROM public.job_postings WHERE brand_id = auth.uid())
    );

COMMIT;
