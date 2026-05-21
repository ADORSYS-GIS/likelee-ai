-- 006_licensing.sql
-- Consolidated migration for licensing domain
-- Source files: 0003_assets_storage_moderation (licensing_requests first def),
-- 0014_license_templates.sql, 0015_license_submissions.sql, 0022_licensing_payouts.sql,
-- 0035_licensing_package_paywall.sql, 0038_agency_payment_links_and_creator_balances.sql,
-- 0039_platform_fee_on_licensing.sql, 0039_remove_budget_ranges.sql,
-- 0040_agency_embedded_signing.sql, 0043_add_talent_ids_to_licensing_requests.sql,
-- 0045_licensing_log_rotation_archival.sql, 20260218_add_talent_id_to_license_submissions.sql,
-- 20260218_add_talent_ids_array_to_license_submissions.sql, 2026-03-04_weekly_licensing_rates_rollout.sql,
-- 2026-03-21_brand_license_requests_consolidated.sql, 2026-05-05_licensing_requests_add_archived_status.sql,
-- 2026-03-27_marketplace_agency_creator_contracts.sql
--
-- FIXED (2026-05-18): Added missing columns per PR review:
-- license_submissions: client_id, talent_names, license_fee, duration_days, start_date,
--   custom_terms, agency_submitter_slug, docuseal_submission_id, docuseal_slug,
--   docuseal_template_id, signed_document_url, sent_at, opened_at, declined_at, decline_reason
-- ADDED: agency_creator_marketplace_contracts table with all DocuSeal columns

BEGIN;

-- ============================================================================
-- 1. LICENSING REQUESTS (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.licensing_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    
    -- Subject (talent, creator, or multiple talents)
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    talent_ids uuid[],
    talent_name text,
    
    -- Context type (distinguishes licensing vs campaign billing stubs)
    context_type text DEFAULT 'licensing' CHECK (context_type IN ('licensing', 'campaign')),
    campaign_offer_id uuid REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
    
    -- Request Details
    subject text,
    campaign_title text,
    client_name text,
    category text,
    territory text,
    usage_scope text,
    regions text,
    deadline date,
    license_start_date date,
    license_end_date date,
    effective_end_date date,
    duration_days integer,
    exclusivity text,
    modifications_allowed text,
    
    -- Rates
    base_rate_weekly_cents bigint,
    base_rate_monthly_cents bigint,
    offered_rate_weekly_cents bigint,
    offered_rate_monthly_cents bigint,
    rate_currency text DEFAULT 'USD',
    rate_source_type text,
    rate_source_id uuid,
    license_fee numeric,
    
    -- Brand Request Reference
    brand_request_id uuid,
    submission_id uuid,
    
    -- Status
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'archived')) DEFAULT 'pending',
    archived_at timestamptz,
    
    -- Review
    notes text,
    negotiation_reason text,
    decided_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Ensure at least one subject is specified (except campaign stubs)
    CONSTRAINT licensing_requests_subject_check CHECK (
        context_type = 'campaign' AND campaign_offer_id IS NOT NULL
        OR talent_id IS NOT NULL
        OR creator_id IS NOT NULL
        OR (talent_ids IS NOT NULL AND cardinality(talent_ids) > 0)
        OR (talent_name IS NOT NULL AND trim(talent_name) <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_licensing_requests_agency ON public.licensing_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_brand ON public.licensing_requests(brand_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_talent ON public.licensing_requests(talent_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_creator ON public.licensing_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_submission ON public.licensing_requests(submission_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_status ON public.licensing_requests(status);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_deadline ON public.licensing_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_license_end_date ON public.licensing_requests(license_end_date);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_effective_end_date ON public.licensing_requests(effective_end_date);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_context_type ON public.licensing_requests(context_type);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_campaign_offer ON public.licensing_requests(campaign_offer_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_created_at ON public.licensing_requests(created_at);

ALTER TABLE public.licensing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their licensing requests" ON public.licensing_requests;
CREATE POLICY "Agencies can view their licensing requests" ON public.licensing_requests
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create their licensing requests" ON public.licensing_requests;
CREATE POLICY "Agencies can create their licensing requests" ON public.licensing_requests
    FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can update their licensing requests" ON public.licensing_requests;
CREATE POLICY "Agencies can update their licensing requests" ON public.licensing_requests
    FOR UPDATE USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can delete their licensing requests" ON public.licensing_requests;
CREATE POLICY "Agencies can delete their licensing requests" ON public.licensing_requests
    FOR DELETE USING (agency_id = auth.uid());

-- ============================================================================
-- 2. LICENSE TEMPLATES (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.license_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Template Info
    name text,
    template_name text,
    category text,
    description text,
    
    -- Usage Type
    usage_type text, -- 'social', 'digital', 'print', 'broadcast', etc.
    usage_scope text,
    
    -- Pricing (flat fee, not range)
    license_fee integer DEFAULT 0,
    
    -- Terms
    duration_days integer,
    exclusivity text,
    territory text,
    modifications_allowed text,
    custom_terms text,
    usage_count integer NOT NULL DEFAULT 0, -- how many times can be used
    docuseal_template_id integer,
    client_name text,
    talent_name text,
    start_date date,
    contract_body text,
    contract_body_format text DEFAULT 'markdown',
    
    -- Template Status
    is_active boolean DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_license_templates_agency ON public.license_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_license_templates_usage ON public.license_templates(usage_type);
CREATE INDEX IF NOT EXISTS idx_license_templates_active ON public.license_templates(agency_id, is_active);

ALTER TABLE public.license_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own license templates" ON public.license_templates;
CREATE POLICY "Agencies can view own license templates" ON public.license_templates
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own license templates" ON public.license_templates;
CREATE POLICY "Agencies can manage own license templates" ON public.license_templates
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 3. LICENSE SUBMISSIONS (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.license_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    template_id uuid REFERENCES public.license_templates(id) ON DELETE SET NULL,
    brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
    licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
    brand_request_id uuid REFERENCES public.brand_license_requests(id) ON DELETE SET NULL,
    client_id uuid REFERENCES public.agency_clients(id) ON DELETE SET NULL,
    
    -- Subject Talent
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    talent_ids uuid[],
    talent_names text,
    
    -- Submission Details
    client_name text,
    client_email text,
    client_company text,
    project_name text,
    
    -- Pricing
    proposed_price integer,
    license_fee bigint,
    duration_days integer,
    start_date date,
    custom_terms text,
    
    -- Brand Request
    requires_agency_signature boolean DEFAULT false,
    agency_submitter_id bigint,
    agency_submitter_slug text,
    agency_embed_src text,
    agency_signed_at timestamptz,
    client_submitter_id bigint,
    client_submitter_slug text,
    
    -- DocuSeal Integration
    docuseal_submission_id integer,
    docuseal_slug text,
    docuseal_template_id integer,
    
    -- Status
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'sent', 'opened', 'under_review', 'approved', 'rejected', 'signed', 'declined', 'archived', 'completed', 'converted', 'agency_pending', 'client_pending', 'expired')),
    archived_at timestamptz,
    
    -- Contract
    contract_url text,
    signed_document_url text,
    sent_at timestamptz,
    opened_at timestamptz,
    signed_at timestamptz,
    declined_at timestamptz,
    decline_reason text,
    
    -- Payout tracking
    payout_id uuid,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_license_submissions_agency ON public.license_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_template ON public.license_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_brand ON public.license_submissions(brand_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_request ON public.license_submissions(licensing_request_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_brand_request ON public.license_submissions(brand_request_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_status ON public.license_submissions(status);
CREATE INDEX IF NOT EXISTS idx_license_submissions_talent ON public.license_submissions(talent_id);
CREATE INDEX IF NOT EXISTS idx_license_submissions_docuseal_submission ON public.license_submissions(docuseal_submission_id);

ALTER TABLE public.license_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own license submissions" ON public.license_submissions;
CREATE POLICY "Agencies can view own license submissions" ON public.license_submissions
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage own license submissions" ON public.license_submissions;
CREATE POLICY "Agencies can manage own license submissions" ON public.license_submissions
    FOR ALL USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Brands can view assigned license submissions" ON public.license_submissions;
CREATE POLICY "Brands can view assigned license submissions" ON public.license_submissions
    FOR SELECT USING (brand_id = auth.uid());

-- ============================================================================
-- 4. LICENSING PAYOUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.licensing_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Source
    submission_id uuid REFERENCES public.license_submissions(id) ON DELETE SET NULL,
    payment_link_id uuid,
    licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
    
    -- Amounts
    amount_cents bigint NOT NULL,
    platform_fee_cents integer NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    
    -- Talent splits (JSONB array of {creator_id, talent_id, amount_cents})
    talent_splits jsonb NOT NULL DEFAULT '[]'::jsonb,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
    paid_at timestamptz,
    failure_reason text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licensing_payouts_agency ON public.licensing_payouts(agency_id);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_submission ON public.licensing_payouts(submission_id);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_status ON public.licensing_payouts(status);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_paid_at ON public.licensing_payouts(paid_at);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_agency_talent_paid ON public.licensing_payouts(agency_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_licensing_request ON public.licensing_payouts(licensing_request_id);

ALTER TABLE public.licensing_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own licensing payouts" ON public.licensing_payouts;
CREATE POLICY "Agencies can view own licensing payouts" ON public.licensing_payouts
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 5. LICENSING CHECKOUT SESSIONS (from 0035)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.licensing_checkout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    submission_id uuid NOT NULL REFERENCES public.license_submissions(id) ON DELETE CASCADE,
    
    -- Stripe
    stripe_session_id text NOT NULL UNIQUE,
    stripe_customer_id text,
    
    -- Amount
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
    
    -- Payment
    payment_intent_id text,
    paid_at timestamptz,
    
    -- Expiration
    expires_at timestamptz NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licensing_checkout_sessions_agency ON public.licensing_checkout_sessions(agency_id);
CREATE INDEX IF NOT EXISTS idx_licensing_checkout_sessions_submission ON public.licensing_checkout_sessions(submission_id);
CREATE INDEX IF NOT EXISTS idx_licensing_checkout_sessions_stripe ON public.licensing_checkout_sessions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_licensing_checkout_sessions_status ON public.licensing_checkout_sessions(status);

ALTER TABLE public.licensing_checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own checkout sessions" ON public.licensing_checkout_sessions;
CREATE POLICY "Agencies can view own checkout sessions" ON public.licensing_checkout_sessions
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 6. LICENSING ACCESS GRANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.licensing_access_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES public.license_submissions(id) ON DELETE CASCADE,
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    
    -- Access Details
    granted_by uuid NOT NULL,
    revoked_by uuid,
    
    -- Validity
    valid_from timestamptz NOT NULL DEFAULT now(),
    valid_until timestamptz,
    
    -- Status
    is_active boolean DEFAULT true,
    revoked_at timestamptz,
    revoke_reason text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licensing_access_grants_submission ON public.licensing_access_grants(submission_id);
CREATE INDEX IF NOT EXISTS idx_licensing_access_grants_brand ON public.licensing_access_grants(brand_id);
CREATE INDEX IF NOT EXISTS idx_licensing_access_grants_active ON public.licensing_access_grants(is_active);
CREATE INDEX IF NOT EXISTS idx_licensing_access_grants_valid ON public.licensing_access_grants(valid_from, valid_until);

ALTER TABLE public.licensing_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own access grants" ON public.licensing_access_grants;
CREATE POLICY "Brands can view own access grants" ON public.licensing_access_grants
    FOR SELECT USING (brand_id = auth.uid());

-- ============================================================================
-- 7. ARCHIVAL FUNCTION (from 0045)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_archived_licensing_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- Delete archived license submissions older than 1 year
    DELETE FROM public.license_submissions
    WHERE status = 'archived'
        AND archived_at < now() - interval '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- 8. LICENSE SUBMISSIONS UPDATED_AT TRIGGER (from 0015)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_license_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_license_submissions_updated_at ON public.license_submissions;
CREATE TRIGGER trigger_license_submissions_updated_at
    BEFORE UPDATE ON public.license_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_license_submissions_updated_at();

COMMIT;
