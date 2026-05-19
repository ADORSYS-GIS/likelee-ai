-- 007_marketplace_connections.sql
-- Consolidated migration for marketplace connections
-- Source files: 2026-03-04_agency_talent_connections.sql,
-- 2026-03-27_marketplace_agency_creator_contracts.sql,
-- 2026-03-30_marketplace_contract_disconnect_workflow.sql,
-- 2026-03-31_fix_agency_talent_relationships_unique_constraint.sql,
-- 0034_agency_talent_invites.sql, 0025_talent_portfolio_showcase.sql,
-- 0026_talent_notifications.sql, 0027_talent_portal_settings.sql,
-- 0028_talent_tax_documents.sql, 0030_talent_booking_preferences.sql,
-- 0024_talent_campaign_metrics_weekly.sql

BEGIN;

-- ============================================================================
-- 1. AGENCY TALENT RELATIONSHIPS (marketplace connections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_talent_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Subject (at least one must be set)
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    
    -- Status
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'declined')),
    
    -- Licensing rates
    licensing_rate_weekly_cents bigint,
    accept_negotiations boolean NOT NULL DEFAULT true,
    rate_currency text NOT NULL DEFAULT 'USD',
    
    -- Performance tier (cached)
    performance_tier_name text NOT NULL DEFAULT 'Inactive',
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Unique constraints
    CONSTRAINT agency_talent_relationships_identity_check CHECK (talent_id IS NOT NULL OR creator_id IS NOT NULL),
    CONSTRAINT agency_talent_relationships_licensing_rate_non_negative CHECK (
        licensing_rate_weekly_cents IS NULL OR licensing_rate_weekly_cents >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_talent_relationships_agency_talent 
    ON public.agency_talent_relationships(agency_id, talent_id) 
    WHERE talent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_talent_relationships_agency_creator 
    ON public.agency_talent_relationships(agency_id, creator_id) 
    WHERE creator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agency_talent_relationships_agency ON public.agency_talent_relationships(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_relationships_talent ON public.agency_talent_relationships(talent_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_relationships_creator ON public.agency_talent_relationships(creator_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_relationships_agency_status ON public.agency_talent_relationships(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_agency_talent_relationships_talent_status ON public.agency_talent_relationships(talent_id, status);

ALTER TABLE public.agency_talent_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their agency talent connections" ON public.agency_talent_relationships;
CREATE POLICY "Agencies can view their agency talent connections" ON public.agency_talent_relationships
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create their agency talent connections" ON public.agency_talent_relationships;
CREATE POLICY "Agencies can create their agency talent connections" ON public.agency_talent_relationships
    FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can update their agency talent connections" ON public.agency_talent_relationships;
CREATE POLICY "Agencies can update their agency talent connections" ON public.agency_talent_relationships
    FOR UPDATE USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view their own active agency links" ON public.agency_talent_relationships;
CREATE POLICY "Creators can view their own active agency links" ON public.agency_talent_relationships
    FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update their own agency links" ON public.agency_talent_relationships;
CREATE POLICY "Creators can update their own agency links" ON public.agency_talent_relationships
    FOR UPDATE USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

-- ============================================================================
-- 2. AGENCY CREATOR MARKETPLACE CONTRACTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_creator_marketplace_contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Contract Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'terminated', 'disconnected')),
    
    -- Disconnect workflow
    disconnect_initiated_by text CHECK (disconnect_initiated_by IN ('agency', 'creator')),
    disconnect_requested_at timestamptz,
    disconnect_reason text,
    disconnect_approved_at timestamptz,
    disconnect_approved_by uuid,
    
    -- Contract Terms
    contract_terms jsonb DEFAULT '{}'::jsonb,
    commission_rate numeric(10, 2),
    
    -- Document
    contract_url text,
    signed_at timestamptz,
    
    -- Metadata
    meta jsonb DEFAULT '{}'::jsonb,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (agency_id, creator_id)
);


ALTER TABLE public.agency_creator_marketplace_contracts
    ADD COLUMN IF NOT EXISTS invite_id uuid,
    ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.license_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS template_name text,
    ADD COLUMN IF NOT EXISTS contract_body text DEFAULT '',
    ADD COLUMN IF NOT EXISTS contract_body_format text DEFAULT 'markdown',
    ADD COLUMN IF NOT EXISTS rendered_contract_body text,
    ADD COLUMN IF NOT EXISTS valid_from date,
    ADD COLUMN IF NOT EXISTS valid_until date,
    ADD COLUMN IF NOT EXISTS placeholder_values jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS docuseal_submission_id integer,
    ADD COLUMN IF NOT EXISTS docuseal_template_id integer,
    ADD COLUMN IF NOT EXISTS docuseal_status text DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS agency_submitter_id bigint,
    ADD COLUMN IF NOT EXISTS agency_submitter_slug text,
    ADD COLUMN IF NOT EXISTS agency_embed_src text,
    ADD COLUMN IF NOT EXISTS creator_submitter_id bigint,
    ADD COLUMN IF NOT EXISTS creator_submitter_slug text,
    ADD COLUMN IF NOT EXISTS signed_document_url text,
    ADD COLUMN IF NOT EXISTS sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.agency_creator_marketplace_contracts
    ALTER COLUMN contract_body SET DEFAULT '',
    ALTER COLUMN contract_body_format SET DEFAULT 'markdown',
    ALTER COLUMN placeholder_values SET DEFAULT '{}'::jsonb,
    ALTER COLUMN docuseal_status SET DEFAULT 'draft';

UPDATE public.agency_creator_marketplace_contracts
SET contract_body = ''
WHERE contract_body IS NULL;

UPDATE public.agency_creator_marketplace_contracts
SET contract_body_format = 'markdown'
WHERE contract_body_format IS NULL OR btrim(contract_body_format) = '';

UPDATE public.agency_creator_marketplace_contracts
SET placeholder_values = '{}'::jsonb
WHERE placeholder_values IS NULL;

UPDATE public.agency_creator_marketplace_contracts
SET docuseal_status = 'draft'
WHERE docuseal_status IS NULL OR btrim(docuseal_status) = '';

ALTER TABLE public.agency_creator_marketplace_contracts
    DROP CONSTRAINT IF EXISTS agency_creator_marketplace_contracts_status_check,
    ADD CONSTRAINT agency_creator_marketplace_contracts_status_check
        CHECK (status IN ('pending', 'active', 'paused', 'terminated', 'disconnected', 'draft', 'pending_signature', 'expired', 'declined', 'voided'))
        NOT VALID;

ALTER TABLE public.agency_creator_marketplace_contracts
    DROP CONSTRAINT IF EXISTS agency_creator_marketplace_contracts_contract_body_format_check,
    ADD CONSTRAINT agency_creator_marketplace_contracts_contract_body_format_check
        CHECK (contract_body_format IN ('markdown', 'html'))
        NOT VALID;

ALTER TABLE public.agency_creator_marketplace_contracts
    DROP CONSTRAINT IF EXISTS agency_creator_marketplace_contracts_valid_window_check,
    ADD CONSTRAINT agency_creator_marketplace_contracts_valid_window_check
        CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from)
        NOT VALID;

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_agency_creator
    ON public.agency_creator_marketplace_contracts (agency_id, creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_creator_status
    ON public.agency_creator_marketplace_contracts (creator_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_invite
    ON public.agency_creator_marketplace_contracts (invite_id);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_docuseal_submission
    ON public.agency_creator_marketplace_contracts (docuseal_submission_id);

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_agency ON public.agency_creator_marketplace_contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_creator ON public.agency_creator_marketplace_contracts(creator_id);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_status ON public.agency_creator_marketplace_contracts(status);

ALTER TABLE public.agency_creator_marketplace_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own marketplace contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Agencies can view own marketplace contracts" ON public.agency_creator_marketplace_contracts
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view own marketplace contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Creators can view own marketplace contracts" ON public.agency_creator_marketplace_contracts
    FOR SELECT USING (creator_id = auth.uid());

-- ============================================================================
-- 3. AGENCY TALENT INVITES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_talent_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Invite Details
    email text NOT NULL,
    full_name text,
    invited_name text,
    
    -- Token
    token text NOT NULL UNIQUE,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    -- Expiration
    expires_at timestamptz NOT NULL,
    
    -- Response
    accepted_at timestamptz,
    declined_at timestamptz,
    responded_at timestamptz,
    declined_reason text,
    
    -- Result
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_talent_invites_agency ON public.agency_talent_invites(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_talent_invites_token ON public.agency_talent_invites(token);
CREATE INDEX IF NOT EXISTS idx_agency_talent_invites_status ON public.agency_talent_invites(status);
CREATE INDEX IF NOT EXISTS idx_agency_talent_invites_expires ON public.agency_talent_invites(expires_at);

ALTER TABLE public.agency_talent_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view own talent invites" ON public.agency_talent_invites;
CREATE POLICY "Agencies can view own talent invites" ON public.agency_talent_invites
    FOR SELECT USING (agency_id = auth.uid());

-- ============================================================================
-- 4. TALENT PORTFOLIO SHOWCASE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_portfolio_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    
    -- Item Details
    title text NOT NULL,
    description text,
    
    -- Media
    media_type text NOT NULL CHECK (media_type IN ('photo', 'video', 'audio', 'document')),
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    thumbnail_url text,
    
    -- Metadata
    width integer,
    height integer,
    duration_sec integer,
    
    -- Display
    is_featured boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    
    -- Visibility
    is_public boolean DEFAULT false,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_talent ON public.talent_portfolio_items(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_creator ON public.talent_portfolio_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_featured ON public.talent_portfolio_items(talent_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_sort ON public.talent_portfolio_items(talent_id, sort_order);

ALTER TABLE public.talent_portfolio_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view talent portfolio" ON public.talent_portfolio_items;
CREATE POLICY "Agencies can view talent portfolio" ON public.talent_portfolio_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_users au
            WHERE au.id = talent_id AND au.agency_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. TALENT NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE CASCADE,
    
    -- Notification Details
    type text NOT NULL,
    title text NOT NULL,
    message text,
    
    -- Data
    data jsonb DEFAULT '{}'::jsonb,
    
    -- Action
    action_url text,
    action_text text,
    
    -- Status
    is_read boolean DEFAULT false,
    read_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_notifications_talent ON public.talent_notifications(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_notifications_creator ON public.talent_notifications(creator_id);
CREATE INDEX IF NOT EXISTS idx_talent_notifications_read ON public.talent_notifications(talent_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_notifications_created ON public.talent_notifications(created_at DESC);

ALTER TABLE public.talent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Talents can view own notifications" ON public.talent_notifications;
CREATE POLICY "Talents can view own notifications" ON public.talent_notifications
    FOR SELECT USING (talent_id IN (
        SELECT id FROM public.agency_users WHERE agency_id = auth.uid()
    ) OR creator_id = auth.uid());

-- ============================================================================
-- 6. TALENT PORTAL SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_portal_settings (
    talent_id uuid PRIMARY KEY REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    
    -- Portal Access
    portal_enabled boolean DEFAULT true,
    
    -- Notifications
    email_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    push_notifications boolean DEFAULT true,
    
    -- Preferences
    preferred_contact_method text DEFAULT 'email',
    timezone text DEFAULT 'America/New_York',
    
    -- Privacy
    profile_visible_to_brands boolean DEFAULT false,
    allow_direct_booking_requests boolean DEFAULT false,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_portal_settings_creator ON public.talent_portal_settings(creator_id);

ALTER TABLE public.talent_portal_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. TALENT TAX DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_tax_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    
    -- Document Details
    document_type text NOT NULL, -- 'w9', 'w8ben', '1099', 'invoice', 'receipt'
    tax_year integer NOT NULL,
    
    -- File
    file_name text NOT NULL,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Review
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_tax_documents_talent ON public.talent_tax_documents(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_tax_documents_creator ON public.talent_tax_documents(creator_id);
CREATE INDEX IF NOT EXISTS idx_talent_tax_documents_year ON public.talent_tax_documents(talent_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_talent_tax_documents_status ON public.talent_tax_documents(status);

ALTER TABLE public.talent_tax_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. TALENT BOOKING PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_booking_preferences (
    talent_id uuid PRIMARY KEY REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    
    -- Availability
    min_notice_days integer DEFAULT 1,
    max_booking_days_ahead integer DEFAULT 90,
    
    -- Rate Preferences
    min_rate_cents integer,
    preferred_rate_cents integer,
    rate_currency text DEFAULT 'USD',
    
    -- Working Preferences
    preferred_working_days integer[] DEFAULT ARRAY[1,2,3,4,5], -- Mon-Fri
    preferred_start_time time DEFAULT '09:00',
    preferred_end_time time DEFAULT '17:00',
    
    -- Location
    willing_to_travel boolean DEFAULT false,
    max_travel_distance_miles integer,
    preferred_locations text[],
    
    -- Job Types
    preferred_job_types text[], -- 'photoshoot', 'video', 'runway', 'event'
    excluded_job_types text[],
    
    -- Requirements
    requires_contract boolean DEFAULT true,
    requires_deposit boolean DEFAULT false,
    deposit_percent integer DEFAULT 50,
    
    -- Auto-accept
    auto_accept_bookings boolean DEFAULT false,
    auto_accept_if_rate_met boolean DEFAULT false,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talent_booking_preferences_creator ON public.talent_booking_preferences(creator_id);

ALTER TABLE public.talent_booking_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. TALENT CAMPAIGN METRICS WEEKLY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.talent_campaign_metrics_weekly (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    
    -- Week
    week_start date NOT NULL,
    
    -- Metrics
    campaign_count integer DEFAULT 0,
    completed_campaign_count integer DEFAULT 0,
    total_earnings_cents bigint DEFAULT 0,
    avg_campaign_rating numeric(3,2),
    
    -- Engagement
    total_impressions bigint,
    total_engagements bigint,
    total_clicks bigint,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (talent_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_talent_campaign_metrics_weekly_talent ON public.talent_campaign_metrics_weekly(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_campaign_metrics_weekly_creator ON public.talent_campaign_metrics_weekly(creator_id);
CREATE INDEX IF NOT EXISTS idx_talent_campaign_metrics_weekly_week ON public.talent_campaign_metrics_weekly(week_start DESC);

ALTER TABLE public.talent_campaign_metrics_weekly ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 10. CREATOR AGENCY INVITES (from 0023)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_agency_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_creator_id ON public.creator_agency_invites(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_agency_id ON public.creator_agency_invites(agency_id);
CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_status ON public.creator_agency_invites(status);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_creator_agency_invites_pending
ON public.creator_agency_invites(agency_id, creator_id) WHERE status = 'pending';

ALTER TABLE public.creator_agency_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 11. AGENCY-CREATOR MARKETPLACE CONTRACTS (from 2026-03-27)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_creator_marketplace_contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    invite_id uuid REFERENCES public.creator_agency_invites(id) ON DELETE SET NULL,
    template_id uuid REFERENCES public.license_templates(id) ON DELETE SET NULL,
    template_name text,
    contract_body text NOT NULL DEFAULT '',
    contract_body_format text NOT NULL DEFAULT 'markdown'
        CHECK (contract_body_format IN ('markdown', 'html')),
    rendered_contract_body text,
    commission_rate numeric(10, 2) NOT NULL
        CHECK (commission_rate >= 0 AND commission_rate <= 100),
    valid_from date NOT NULL,
    valid_until date NOT NULL,
    placeholder_values jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_signature', 'active', 'expired', 'declined', 'voided')),
    docuseal_submission_id integer,
    docuseal_template_id integer,
    docuseal_status text NOT NULL DEFAULT 'draft',
    agency_submitter_id bigint,
    agency_submitter_slug text,
    agency_embed_src text,
    creator_submitter_id bigint,
    creator_submitter_slug text,
    signed_document_url text,
    sent_at timestamptz,
    signed_at timestamptz,
    last_synced_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT agency_creator_marketplace_contracts_valid_window_check
        CHECK (valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_agency_creator
    ON public.agency_creator_marketplace_contracts (agency_id, creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_creator_status
    ON public.agency_creator_marketplace_contracts (creator_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_invite
    ON public.agency_creator_marketplace_contracts (invite_id);
CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_docuseal_submission
    ON public.agency_creator_marketplace_contracts (docuseal_submission_id);

ALTER TABLE public.creator_agency_invites
    ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.agency_creator_marketplace_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_contract_id
    ON public.creator_agency_invites(contract_id);

ALTER TABLE public.agency_creator_marketplace_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Agencies can view marketplace creator contracts"
    ON public.agency_creator_marketplace_contracts
    FOR SELECT
    USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Agencies can manage marketplace creator contracts"
    ON public.agency_creator_marketplace_contracts
    FOR ALL
    USING (agency_id = auth.uid())
    WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view their marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Creators can view their marketplace creator contracts"
    ON public.agency_creator_marketplace_contracts
    FOR SELECT
    USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update their marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Creators can update their marketplace creator contracts"
    ON public.agency_creator_marketplace_contracts
    FOR UPDATE
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view their agency invites" ON public.creator_agency_invites;
CREATE POLICY "Creators can view their agency invites" ON public.creator_agency_invites
FOR SELECT USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view their sent invites" ON public.creator_agency_invites;
CREATE POLICY "Agencies can view their sent invites" ON public.creator_agency_invites
FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create invites" ON public.creator_agency_invites;
CREATE POLICY "Agencies can create invites" ON public.creator_agency_invites
FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can respond to their invites" ON public.creator_agency_invites;
CREATE POLICY "Creators can respond to their invites" ON public.creator_agency_invites
FOR UPDATE USING (creator_id = auth.uid() AND status = 'pending')
WITH CHECK (creator_id = auth.uid() AND status IN ('accepted', 'declined'));

DROP POLICY IF EXISTS "Agencies can revoke their invites" ON public.creator_agency_invites;
CREATE POLICY "Agencies can revoke their invites" ON public.creator_agency_invites
FOR UPDATE USING (agency_id = auth.uid() AND status = 'pending')
WITH CHECK (agency_id = auth.uid() AND status = 'revoked');

COMMIT;
