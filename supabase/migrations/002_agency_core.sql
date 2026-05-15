-- 002_agency_core.sql
-- Consolidated migration for all agency-related schema
-- NOTE: FK constraints for agency_files.relationship_id and agency_invoices.booking_id
-- deferred to 018_fk_fixups.sql (forward references to 007/009)
-- Consolidated migration for all agency-related schema
-- Source files: 0001_core_profiles (agencies), 0005_agency_users, 0007_agency_talent_management,
-- 0007_agency_clients, 0008_agency_files, 0009_agency_invoicing, 0010_random_invoice_numbers,
-- 0010_crm_migration, 0011_invoice_reminders, 0012_agency_expenses, 0012_client_files_notes,
-- 0013_agency_stripe_connect, 0014_agency_commission_settings, 0015_agency_email_templates,
-- 0016_agency_notification_tax_currency_settings, 0017_agency_storage, 0018_agency_billing_subscriptions,
-- 0019_agency_veriff_usage, 2026-02-17_agency_payout_scheduler, 2026-03-12_agency_calendly_settings,
-- 2026-04-02_add_calendly_scheduling_url, 2026-04-02_agency_billing_columns, 2026-04-02_agency_trial_period,
-- 2026-04-13_01_agency_studio_addon, 2026-04-15_agency_creator_identity_compat

BEGIN;

-- ============================================================================
-- 1. AGENCIES TABLE (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agencies (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core fields
    agency_name text NOT NULL,
    company_name text,
    contact_name text,
    contact_title text,
    email text NOT NULL,
    website text,
    phone_number text,
    
    -- Address
    legal_entity_name text,
    address text,
    city text,
    state text,
    zip_postal_code text,
    country text,
    time_zone text,
    
    -- Business info
    tax_id_ein text,
    agency_type text,
    client_count text,
    campaign_budget text,
    services_offered jsonb,
    provide_creators text,
    handle_contracts text,
    talent_count text,
    licenses_likeness text,
    open_to_ai jsonb,
    campaign_types jsonb,
    bulk_onboard text,
    
    -- Branding
    logo_url text,
    email_signature text,
    primary_color text,
    secondary_color text,
    
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
    
    -- Billing & Subscriptions
    plan_tier text NOT NULL DEFAULT 'none',
    plan_interval text NOT NULL DEFAULT 'month',
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_current_period_end timestamptz,
    stripe_cancel_at_period_end boolean NOT NULL DEFAULT false,
    plan_updated_at timestamptz,
    trial_ends_at timestamptz,
    
    -- Stripe Connect
    stripe_connect_account_id text,
    payouts_enabled boolean NOT NULL DEFAULT false,
    last_payout_error text,
    
    -- Studio Addon
    studio_addon_active boolean NOT NULL DEFAULT false,
    studio_addon_activated_at timestamptz,
    
    -- IRL Booking Addon
    addon_irl_booking_enabled boolean NOT NULL DEFAULT false,
    
    -- Commission Config
    performance_commission_config jsonb DEFAULT '{
      "standard": {"agency_percent": 20, "creator_percent": 80},
      "premium": {"agency_percent": 15, "creator_percent": 85}
    }'::jsonb,
    
    -- Legacy (kept for compatibility)
    subscription_status text,
    subscription_tier text,
    subscription_current_period_end timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agencies indexes
CREATE INDEX IF NOT EXISTS idx_agencies_email ON public.agencies(email);
CREATE INDEX IF NOT EXISTS idx_agencies_type ON public.agencies(agency_type);
CREATE INDEX IF NOT EXISTS idx_agencies_plan_tier ON public.agencies(plan_tier);
CREATE INDEX IF NOT EXISTS idx_agencies_stripe_customer_id ON public.agencies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_agencies_stripe_subscription_id ON public.agencies(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_agencies_stripe_connect_account_id ON public.agencies(stripe_connect_account_id);
CREATE INDEX IF NOT EXISTS idx_agencies_plan_interval ON public.agencies(plan_interval);
CREATE INDEX IF NOT EXISTS idx_agencies_studio_addon_active ON public.agencies(studio_addon_active);

-- Agencies RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own agency profile" ON public.agencies;
CREATE POLICY "Users can view their own agency profile" ON public.agencies
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own agency profile" ON public.agencies;
CREATE POLICY "Users can update their own agency profile" ON public.agencies
    FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 2. AGENCY USERS TABLE (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id uuid REFERENCES public.creators(id),
    
    -- Role & Status
    role text NOT NULL DEFAULT 'talent',
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    
    -- Basic Information
    full_legal_name text NOT NULL,
    stage_name text,
    email text,
    phone_number text,
    date_of_birth date,
    city text,
    state_province text,
    country text,
    bio_notes text,
    
    -- Physical Attributes
    gender_identity text,
    race_ethnicity text[],
    hair_color text,
    eye_color text,
    skin_tone text,
    height_feet integer,
    height_inches integer,
    bust_chest_inches integer,
    waist_inches integer,
    hips_inches integer,
    special_skills text[],
    tattoos boolean,
    piercings boolean,
    
    -- Media & Social
    profile_photo_url text,
    hero_cameo_url text,
    photo_gallery text[],
    photo_urls text[] NOT NULL DEFAULT '{}'::text[],
    voice_sample_url text,
    instagram_handle text,
    instagram_followers bigint DEFAULT 0,
    engagement_rate numeric(5,2) DEFAULT 0.0,
    video_url text,
    
    -- Performance Metrics
    total_earnings_cents bigint NOT NULL DEFAULT 0,
    active_licenses_count integer NOT NULL DEFAULT 0,
    total_assets integer DEFAULT 0,
    top_brand text,
    earnings_30d bigint DEFAULT 0,
    projected_earnings bigint DEFAULT 0,
    
    -- Licensing & Consent
    role_type text DEFAULT 'Model',
    consent_status text DEFAULT 'missing',
    license_expiry date,
    is_verified_talent boolean DEFAULT false,
    last_reminder_sent timestamptz,
    ai_usage boolean,
    
    -- Performance Tier (cached)
    performance_tier_name text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agency users indexes
CREATE INDEX IF NOT EXISTS idx_agency_users_agency ON public.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_email ON public.agency_users(email);
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON public.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_role ON public.agency_users(role);
CREATE INDEX IF NOT EXISTS idx_agency_users_status ON public.agency_users(status);
CREATE INDEX IF NOT EXISTS idx_agency_users_creator_id ON public.agency_users(creator_id);

-- Agency users RLS
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency users can view their agency's roster" ON public.agency_users;
CREATE POLICY "Agency users can view their agency's roster" 
    ON public.agency_users FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agencies can view their own members" ON public.agency_users;
CREATE POLICY "Agencies can view their own members" ON public.agency_users
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage their own members" ON public.agency_users;
CREATE POLICY "Agencies can manage their own members" ON public.agency_users
    FOR ALL USING (agency_id = auth.uid());

-- ============================================================================
-- 3. AGENCY CLIENTS TABLE (with all final columns inline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    -- Core fields
    company text NOT NULL,
    contact_name text,
    email text,
    phone text,
    terms text,
    industry text,
    
    -- CRM fields
    status text DEFAULT 'Lead',
    website text,
    tags text[] DEFAULT '{}',
    preferences jsonb DEFAULT '{}'::jsonb,
    notes text,
    next_follow_up_date date,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agency clients indexes
CREATE INDEX IF NOT EXISTS idx_agency_clients_agency_id ON public.agency_clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_clients_company ON public.agency_clients(company);

-- Agency clients RLS
ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_clients select own" ON public.agency_clients;
CREATE POLICY "agency_clients select own" ON public.agency_clients
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_clients insert own" ON public.agency_clients;
CREATE POLICY "agency_clients insert own" ON public.agency_clients
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_clients update own" ON public.agency_clients;
CREATE POLICY "agency_clients update own" ON public.agency_clients
    FOR UPDATE USING (auth.uid() = agency_id);

-- ============================================================================
-- 4. CLIENT CONTACTS & COMMUNICATIONS (CRM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.client_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
    name text NOT NULL,
    role text,
    email text,
    phone text,
    is_primary boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON public.client_contacts(client_id);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_clients_contacts select own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts select own" ON public.client_contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_clients
            WHERE id = client_id AND agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_clients_contacts insert own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts insert own" ON public.client_contacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agency_clients
            WHERE id = client_id AND agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_clients_contacts update own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts update own" ON public.client_contacts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.agency_clients
            WHERE id = client_id AND agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_clients_contacts delete own" ON public.client_contacts;
CREATE POLICY "agency_clients_contacts delete own" ON public.client_contacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.agency_clients
            WHERE id = client_id AND agency_id = auth.uid()
        )
    );

CREATE TABLE IF NOT EXISTS public.client_communications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES public.client_contacts(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'other')),
    subject text NOT NULL,
    content text,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON public.client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_contact_id ON public.client_communications(contact_id);

ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_clients_communications select own" ON public.client_communications;
CREATE POLICY "agency_clients_communications select own" ON public.client_communications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_clients
            WHERE id = client_id AND agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_clients_communications insert own" ON public.client_communications;
CREATE POLICY "agency_clients_communications insert own" ON public.client_communications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agency_clients
            WHERE id = client_id AND agency_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. AGENCY FILES & FOLDERS (with creator identity compatibility)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES public.agency_folders(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_folders_agency_id ON public.agency_folders(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_folders_parent_id ON public.agency_folders(parent_id);

ALTER TABLE public.agency_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_folders select own" ON public.agency_folders;
CREATE POLICY "agency_folders select own" ON public.agency_folders
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_folders insert own" ON public.agency_folders;
CREATE POLICY "agency_folders insert own" ON public.agency_folders
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_folders update own" ON public.agency_folders;
CREATE POLICY "agency_folders update own" ON public.agency_folders
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_folders delete own" ON public.agency_folders;
CREATE POLICY "agency_folders delete own" ON public.agency_folders
    FOR DELETE USING (auth.uid() = agency_id);

CREATE TABLE IF NOT EXISTS public.agency_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id uuid REFERENCES public.agency_clients(id) ON DELETE CASCADE,
    talent_id uuid REFERENCES public.agency_users(id) ON DELETE SET NULL,
    creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
    relationship_id uuid,
    folder_id uuid REFERENCES public.agency_folders(id) ON DELETE SET NULL,
    
    file_name text NOT NULL,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    size_bytes bigint NOT NULL DEFAULT 0,
    mime_type text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_files_agency_id ON public.agency_files(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_files_client_id ON public.agency_files(client_id);
CREATE INDEX IF NOT EXISTS idx_agency_files_folder_id ON public.agency_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_agency_files_talent_id ON public.agency_files(talent_id);
CREATE INDEX IF NOT EXISTS idx_agency_files_creator_id ON public.agency_files(creator_id);
CREATE INDEX IF NOT EXISTS idx_agency_files_relationship_id ON public.agency_files(relationship_id);

ALTER TABLE public.agency_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_files select own" ON public.agency_files;
CREATE POLICY "agency_files select own" ON public.agency_files
    FOR SELECT USING (
        auth.uid() = agency_id OR 
        EXISTS (
            SELECT 1 FROM public.agency_clients
            WHERE id = client_id AND agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_files insert own" ON public.agency_files;
CREATE POLICY "agency_files insert own" ON public.agency_files
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_files update own" ON public.agency_files;
CREATE POLICY "agency_files update own" ON public.agency_files
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_files delete own" ON public.agency_files;
CREATE POLICY "agency_files delete own" ON public.agency_files
    FOR DELETE USING (auth.uid() = agency_id);

-- ============================================================================
-- 6. AGENCY INVOICING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_invoice_counters (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    counter integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Random invoice number generator (from 0010_random_invoice_numbers, NOT sequential 0009 version)
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_agency_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    random_letter text;
    random_digits text;
    invoice_number text;
    exists_check boolean;
BEGIN
    -- Generate random letter (A-Z)
    random_letter := chr(65 + floor(random() * 26)::integer);
    -- Generate 7 random digits
    random_digits := lpad(floor(random() * 10000000)::text, 7, '0');
    invoice_number := 'INVC' || random_letter || random_digits;
    
    -- Check for collision and retry if necessary
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.agency_invoices 
            WHERE agency_id = p_agency_id AND invoice_number = invoice_number
        ) INTO exists_check;
        
        EXIT WHEN NOT exists_check;
        
        -- Generate new random values
        random_letter := chr(65 + floor(random() * 26)::integer);
        random_digits := lpad(floor(random() * 10000000)::text, 7, '0');
        invoice_number := 'INVC' || random_letter || random_digits;
    END LOOP;
    
    RETURN invoice_number;
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.agency_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE RESTRICT,
    booking_id uuid,
    
    invoice_number text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
    
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    sent_at timestamptz,
    paid_at timestamptz,
    
    bill_to_company text NOT NULL,
    bill_to_contact_name text,
    bill_to_email text,
    bill_to_phone text,
    
    po_number text,
    project_reference text,
    
    currency text NOT NULL DEFAULT 'USD',
    payment_terms text NOT NULL DEFAULT 'net_30',
    
    agency_commission_bps integer NOT NULL DEFAULT 2000,
    tax_rate_bps integer NOT NULL DEFAULT 0,
    tax_exempt boolean NOT NULL DEFAULT false,
    discount_cents integer NOT NULL DEFAULT 0,
    
    notes_internal text,
    payment_instructions text,
    footer_text text,
    attachment_html text,
    
    subtotal_cents integer NOT NULL DEFAULT 0,
    expenses_cents integer NOT NULL DEFAULT 0,
    tax_cents integer NOT NULL DEFAULT 0,
    total_cents integer NOT NULL DEFAULT 0,
    agency_fee_cents integer NOT NULL DEFAULT 0,
    talent_net_cents integer NOT NULL DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (agency_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_agency_invoices_agency_id ON public.agency_invoices(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_client_id ON public.agency_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_status ON public.agency_invoices(status);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_invoice_date ON public.agency_invoices(invoice_date);

ALTER TABLE public.agency_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoices select own" ON public.agency_invoices;
CREATE POLICY "agency_invoices select own" ON public.agency_invoices
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoices insert own" ON public.agency_invoices;
CREATE POLICY "agency_invoices insert own" ON public.agency_invoices
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoices update own" ON public.agency_invoices;
CREATE POLICY "agency_invoices update own" ON public.agency_invoices
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoices delete own" ON public.agency_invoices;
CREATE POLICY "agency_invoices delete own" ON public.agency_invoices
    FOR DELETE USING (auth.uid() = agency_id);

CREATE TABLE IF NOT EXISTS public.agency_invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.agency_invoices(id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    
    description text NOT NULL,
    talent_id uuid,
    talent_name text,
    date_of_service date,
    rate_type text,
    
    quantity numeric NOT NULL DEFAULT 1,
    unit_price_cents integer NOT NULL DEFAULT 0,
    line_total_cents integer NOT NULL DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_invoice_items_invoice_id ON public.agency_invoice_items(invoice_id);

ALTER TABLE public.agency_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_items select own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items select own" ON public.agency_invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_invoice_items insert own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items insert own" ON public.agency_invoice_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_invoice_items update own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items update own" ON public.agency_invoice_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_invoice_items delete own" ON public.agency_invoice_items;
CREATE POLICY "agency_invoice_items delete own" ON public.agency_invoice_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

CREATE TABLE IF NOT EXISTS public.agency_invoice_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.agency_invoices(id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    
    description text NOT NULL,
    amount_cents integer NOT NULL DEFAULT 0,
    taxable boolean NOT NULL DEFAULT false,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_invoice_expenses_invoice_id ON public.agency_invoice_expenses(invoice_id);

ALTER TABLE public.agency_invoice_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_expenses select own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses select own" ON public.agency_invoice_expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_invoice_expenses insert own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses insert own" ON public.agency_invoice_expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_invoice_expenses update own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses update own" ON public.agency_invoice_expenses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agency_invoice_expenses delete own" ON public.agency_invoice_expenses;
CREATE POLICY "agency_invoice_expenses delete own" ON public.agency_invoice_expenses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.agency_invoices i
            WHERE i.id = invoice_id AND i.agency_id = auth.uid()
        )
    );

-- Invoice Reminder Settings & Events
CREATE TABLE IF NOT EXISTS public.agency_invoice_reminder_settings (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    enabled_3_days_before boolean NOT NULL DEFAULT true,
    enabled_on_due_date boolean NOT NULL DEFAULT true,
    enabled_7_days_after boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_invoice_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_reminder_settings select own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings select own" ON public.agency_invoice_reminder_settings
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_settings insert own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings insert own" ON public.agency_invoice_reminder_settings
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_settings update own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings update own" ON public.agency_invoice_reminder_settings
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_settings delete own" ON public.agency_invoice_reminder_settings;
CREATE POLICY "agency_invoice_reminder_settings delete own" ON public.agency_invoice_reminder_settings
    FOR DELETE USING (auth.uid() = agency_id);

CREATE TABLE IF NOT EXISTS public.agency_invoice_reminder_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    invoice_id uuid NOT NULL REFERENCES public.agency_invoices(id) ON DELETE CASCADE,
    reminder_type text NOT NULL CHECK (reminder_type IN ('before_3_days', 'on_due_date', 'after_7_days')),
    scheduled_for date NOT NULL,
    sent_at timestamptz NOT NULL DEFAULT now(),
    to_email text NOT NULL,
    status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    error text,
    UNIQUE (invoice_id, reminder_type, scheduled_for)
);

CREATE INDEX IF NOT EXISTS idx_agency_invoice_reminder_events_agency_id ON public.agency_invoice_reminder_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invoice_reminder_events_invoice_id ON public.agency_invoice_reminder_events(invoice_id);

ALTER TABLE public.agency_invoice_reminder_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_invoice_reminder_events select own" ON public.agency_invoice_reminder_events;
CREATE POLICY "agency_invoice_reminder_events select own" ON public.agency_invoice_reminder_events
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_invoice_reminder_events insert own" ON public.agency_invoice_reminder_events;
CREATE POLICY "agency_invoice_reminder_events insert own" ON public.agency_invoice_reminder_events
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

-- ============================================================================
-- 7. AGENCY EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    
    name text NOT NULL,
    category text NOT NULL,
    expense_date date NOT NULL,
    
    amount_cents integer NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    
    status text NOT NULL DEFAULT 'approved',
    submitter text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_expenses_agency_id ON public.agency_expenses(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_expenses_expense_date ON public.agency_expenses(expense_date);

ALTER TABLE public.agency_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_expenses select own" ON public.agency_expenses;
CREATE POLICY "agency_expenses select own" ON public.agency_expenses
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "agency_expenses insert own" ON public.agency_expenses;
CREATE POLICY "agency_expenses insert own" ON public.agency_expenses
    FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "agency_expenses update own" ON public.agency_expenses;
CREATE POLICY "agency_expenses update own" ON public.agency_expenses
    FOR UPDATE USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "agency_expenses delete own" ON public.agency_expenses;
CREATE POLICY "agency_expenses delete own" ON public.agency_expenses
    FOR DELETE USING (agency_id = auth.uid());

-- ============================================================================
-- 8. AGENCY COMMISSION SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_commission_settings (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    default_commission_bps integer NOT NULL DEFAULT 2000,
    division_commissions jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_commission_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_commission_settings select own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings select own" ON public.agency_commission_settings
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_commission_settings insert own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings insert own" ON public.agency_commission_settings
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_commission_settings update own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings update own" ON public.agency_commission_settings
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_commission_settings delete own" ON public.agency_commission_settings;
CREATE POLICY "agency_commission_settings delete own" ON public.agency_commission_settings
    FOR DELETE USING (auth.uid() = agency_id);

-- ============================================================================
-- 9. AGENCY EMAIL TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_email_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    template_key text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (agency_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_agency_email_templates_agency_id ON public.agency_email_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_email_templates_is_active ON public.agency_email_templates(is_active);

ALTER TABLE public.agency_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_email_templates select own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates select own" ON public.agency_email_templates
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_email_templates insert own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates insert own" ON public.agency_email_templates
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_email_templates update own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates update own" ON public.agency_email_templates
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_email_templates delete own" ON public.agency_email_templates;
CREATE POLICY "agency_email_templates delete own" ON public.agency_email_templates
    FOR DELETE USING (auth.uid() = agency_id);

-- ============================================================================
-- 10. AGENCY NOTIFICATION & TAX/CURRENCY SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_notification_settings (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    prefs jsonb NOT NULL DEFAULT '[]'::jsonb,
    recipients jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_notification_settings select own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings select own" ON public.agency_notification_settings
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_notification_settings insert own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings insert own" ON public.agency_notification_settings
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_notification_settings update own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings update own" ON public.agency_notification_settings
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_notification_settings delete own" ON public.agency_notification_settings;
CREATE POLICY "agency_notification_settings delete own" ON public.agency_notification_settings
    FOR DELETE USING (auth.uid() = agency_id);

CREATE TABLE IF NOT EXISTS public.agency_tax_currency_settings (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    default_currency text NOT NULL DEFAULT 'usd',
    currency_display_format text NOT NULL DEFAULT '1234.56',
    default_tax_rate numeric NOT NULL DEFAULT 0,
    tax_display_name text NOT NULL DEFAULT 'Sales Tax',
    include_tax_in_displayed_prices boolean NOT NULL DEFAULT true,
    default_payment_terms text NOT NULL DEFAULT 'net30',
    late_payment_fee numeric NOT NULL DEFAULT 0,
    invoice_prefix text NOT NULL DEFAULT 'INV-',
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_tax_currency_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_tax_currency_settings select own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings select own" ON public.agency_tax_currency_settings
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_tax_currency_settings insert own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings insert own" ON public.agency_tax_currency_settings
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_tax_currency_settings update own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings update own" ON public.agency_tax_currency_settings
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_tax_currency_settings delete own" ON public.agency_tax_currency_settings;
CREATE POLICY "agency_tax_currency_settings delete own" ON public.agency_tax_currency_settings
    FOR DELETE USING (auth.uid() = agency_id);

-- ============================================================================
-- 11. AGENCY STORAGE SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_storage_settings (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    storage_limit_bytes bigint NOT NULL DEFAULT 5368709120,  -- 5GB default
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_storage_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_storage_settings select own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings select own" ON public.agency_storage_settings
    FOR SELECT USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_storage_settings insert own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings insert own" ON public.agency_storage_settings
    FOR INSERT WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_storage_settings update own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings update own" ON public.agency_storage_settings
    FOR UPDATE USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "agency_storage_settings delete own" ON public.agency_storage_settings;
CREATE POLICY "agency_storage_settings delete own" ON public.agency_storage_settings
    FOR DELETE USING (auth.uid() = agency_id);

-- ============================================================================
-- 12. AGENCY VERIFF SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_veriff_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    veriff_session_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_veriff_sessions_agency_created ON public.agency_veriff_sessions(agency_id, created_at DESC);

ALTER TABLE public.agency_veriff_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_veriff_sessions select own" ON public.agency_veriff_sessions;
CREATE POLICY "agency_veriff_sessions select own" ON public.agency_veriff_sessions
    FOR SELECT USING (auth.uid() = agency_id);

-- ============================================================================
-- 13. AGENCY CALENDLY SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_calendly_settings (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    calendly_api_token text,
    is_enabled boolean NOT NULL DEFAULT false,
    mappings jsonb NOT NULL DEFAULT '{}'::jsonb,
    scheduling_url text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agency_calendly_settings IS 'Stores agency-specific Calendly configuration and event type mappings';
COMMENT ON COLUMN public.agency_calendly_settings.mappings IS 'JSON object mapping internal booking types to Calendly event type slugs';

ALTER TABLE public.agency_calendly_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencies can manage their own calendly settings"
    ON public.agency_calendly_settings
    FOR ALL
    TO authenticated
    USING (agency_id IN (SELECT id FROM public.agencies WHERE id = auth.uid()))
    WITH CHECK (agency_id IN (SELECT id FROM public.agencies WHERE id = auth.uid()));

-- ============================================================================
-- 14. AGENCY PAYOUT SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_payout_settings (
    agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
    schedule_type text NOT NULL DEFAULT 'manual' CHECK (schedule_type IN ('manual', 'weekly', 'biweekly', 'monthly')),
    next_scheduled_date date,
    min_payout_cents integer NOT NULL DEFAULT 10000,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_payout_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_payout_settings select own" ON public.agency_payout_settings;
CREATE POLICY "agency_payout_settings select own" ON public.agency_payout_settings
    FOR SELECT USING (auth.uid() = agency_id);

-- ============================================================================
-- 15. WEBHOOK EVENTS (for Stripe observability)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_created_at ON public.webhook_events(provider, created_at DESC);

-- ============================================================================
-- 16. AGENCY SUBSCRIPTIONS (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    stripe_customer_id text,
    stripe_subscription_id text NOT NULL,
    stripe_price_id text,
    status text NOT NULL,
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_agency_id ON public.agency_subscriptions(agency_id);

ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_subscriptions select own" ON public.agency_subscriptions;
CREATE POLICY "agency_subscriptions select own" ON public.agency_subscriptions
    FOR SELECT USING (auth.uid() = agency_id);

-- ============================================================================
-- 17. UTILITY FUNCTIONS
-- ============================================================================

-- Update trigger function for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Storage helper function (also referenced in brand/storage migrations)
CREATE OR REPLACE FUNCTION public.ensure_storage(
    p_public_bucket text,
    p_private_bucket text,
    p_temp_bucket text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create buckets in an idempotent way
    INSERT INTO storage.buckets (id, name, public)
    SELECT p_public_bucket, p_public_bucket, true
    WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_public_bucket);

    INSERT INTO storage.buckets (id, name, public)
    SELECT p_private_bucket, p_private_bucket, false
    WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_private_bucket);

    INSERT INTO storage.buckets (id, name, public)
    SELECT p_temp_bucket, p_temp_bucket, false
    WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = p_temp_bucket);

    -- Idempotent public read policy for public bucket
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='public read '||p_public_bucket
    ) THEN
        EXECUTE format('CREATE POLICY %I ON storage.objects FOR SELECT TO public USING (bucket_id = %L);', 'public read '||p_public_bucket, p_public_bucket);
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_storage(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_storage(text, text, text) TO anon, authenticated, service_role;

COMMIT;
