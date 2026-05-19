-- Fix organization_memberships RLS recursion.
--
-- The old "Owners can manage memberships" policy queried organization_memberships
-- directly while Postgres was evaluating policies for organization_memberships,
-- which triggers SQLSTATE 42P17: infinite recursion detected in policy.

BEGIN;

-- Forward-port schema edits that were added to earlier consolidated migrations
-- after some databases had already run them.
ALTER TABLE public.creators
    ADD COLUMN IF NOT EXISTS full_name text,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS state text,
    ADD COLUMN IF NOT EXISTS profile_photo_url text,
    ADD COLUMN IF NOT EXISTS profile_avatar_id uuid DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS age integer,
    ADD COLUMN IF NOT EXISTS race text,
    ADD COLUMN IF NOT EXISTS hair_color text,
    ADD COLUMN IF NOT EXISTS hairstyle text,
    ADD COLUMN IF NOT EXISTS eye_color text,
    ADD COLUMN IF NOT EXISTS height_cm integer,
    ADD COLUMN IF NOT EXISTS weight_kg integer,
    ADD COLUMN IF NOT EXISTS facial_features text[],
    ADD COLUMN IF NOT EXISTS tagline text,
    ADD COLUMN IF NOT EXISTS bio text,
    ADD COLUMN IF NOT EXISTS portfolio_link text,
    ADD COLUMN IF NOT EXISTS public_profile_visible boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS liveness_status text DEFAULT 'not_started',
    ADD COLUMN IF NOT EXISTS kyc_provider text,
    ADD COLUMN IF NOT EXISTS kyc_session_id text,
    ADD COLUMN IF NOT EXISTS verified_at timestamptz,
    ADD COLUMN IF NOT EXISTS kyc_rejection_reason text,
    ADD COLUMN IF NOT EXISTS kyc_rejection_code text,
    ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS plan_interval text DEFAULT 'month',
    ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS stripe_customer_id text,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
    ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
    ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'email_verification',
    ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS licensing_rate_weekly_cents bigint,
    ADD COLUMN IF NOT EXISTS licensing_rate_monthly_cents bigint,
    ADD COLUMN IF NOT EXISTS accept_negotiations boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS rate_currency text DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS creatify_api_key text,
    ADD COLUMN IF NOT EXISTS creatify_account_id text,
    ADD COLUMN IF NOT EXISTS creatify_webhook_secret text,
    ADD COLUMN IF NOT EXISTS creatify_job_id text,
    ADD COLUMN IF NOT EXISTS creatify_job_status text DEFAULT 'idle',
    ADD COLUMN IF NOT EXISTS creatify_avatar_status text DEFAULT 'not_created',
    ADD COLUMN IF NOT EXISTS creatify_output_url text,
    ADD COLUMN IF NOT EXISTS creatify_last_error text,
    ADD COLUMN IF NOT EXISTS instagram_handle text,
    ADD COLUMN IF NOT EXISTS instagram_followers bigint DEFAULT 0,
    ADD COLUMN IF NOT EXISTS instagram_connected boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS instagram_engagement_rate numeric(5,2),
    ADD COLUMN IF NOT EXISTS instagram_last_synced_at timestamptz,
    ADD COLUMN IF NOT EXISTS birthdate date,
    ADD COLUMN IF NOT EXISTS gender text,
    ADD COLUMN IF NOT EXISTS creator_type text,
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'creator',
    ADD COLUMN IF NOT EXISTS athlete_type text,
    ADD COLUMN IF NOT EXISTS platform_handle text,
    ADD COLUMN IF NOT EXISTS primary_platform text,
    ADD COLUMN IF NOT EXISTS tiktok_handle text,
    ADD COLUMN IF NOT EXISTS twitter_handle text,
    ADD COLUMN IF NOT EXISTS content_restrictions text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS brand_exclusivity text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'waitlist',
    ADD COLUMN IF NOT EXISTS content_types text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS content_other text,
    ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS brand_categories text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS work_types text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS vibes text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS representation_status text,
    ADD COLUMN IF NOT EXISTS headshot_url text,
    ADD COLUMN IF NOT EXISTS sport text,
    ADD COLUMN IF NOT EXISTS school_name text,
    ADD COLUMN IF NOT EXISTS languages text,
    ADD COLUMN IF NOT EXISTS base_monthly_price_cents integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS base_weekly_price_cents integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pricing_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS trial_basic_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS trial_pro_started_at timestamptz,
    ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamptz,
    ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_public_brands boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS cameo_front_url text,
    ADD COLUMN IF NOT EXISTS cameo_back_url text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.creators
SET role = 'creator'
WHERE role IS NULL OR btrim(role) = '';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns AS c
        WHERE c.table_schema = 'public'
            AND c.table_name = 'creators'
            AND c.column_name = 'ethnicity'
            AND c.data_type = 'text'
    ) THEN
        ALTER TABLE public.creators ALTER COLUMN ethnicity DROP DEFAULT;
        ALTER TABLE public.creators
            ALTER COLUMN ethnicity TYPE text[]
            USING CASE
                WHEN ethnicity IS NULL OR btrim(ethnicity) = '' THEN '{}'::text[]
                ELSE ARRAY[ethnicity]
            END;
        ALTER TABLE public.creators ALTER COLUMN ethnicity SET DEFAULT '{}';
    ELSIF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns AS c
        WHERE c.table_schema = 'public'
            AND c.table_name = 'creators'
            AND c.column_name = 'ethnicity'
    ) THEN
        ALTER TABLE public.creators ADD COLUMN ethnicity text[] DEFAULT '{}';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns AS c
        WHERE c.table_schema = 'public'
            AND c.table_name = 'creators'
            AND c.column_name = 'content_restrictions'
            AND c.data_type = 'text'
    ) THEN
        ALTER TABLE public.creators ALTER COLUMN content_restrictions DROP DEFAULT;
        ALTER TABLE public.creators
            ALTER COLUMN content_restrictions TYPE text[]
            USING CASE
                WHEN content_restrictions IS NULL OR btrim(content_restrictions) = '' THEN '{}'::text[]
                ELSE ARRAY[content_restrictions]
            END;
        ALTER TABLE public.creators ALTER COLUMN content_restrictions SET DEFAULT '{}'::text[];
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns AS c
        WHERE c.table_schema = 'public'
            AND c.table_name = 'creators'
            AND c.column_name = 'brand_exclusivity'
            AND c.data_type = 'text'
    ) THEN
        ALTER TABLE public.creators ALTER COLUMN brand_exclusivity DROP DEFAULT;
        ALTER TABLE public.creators
            ALTER COLUMN brand_exclusivity TYPE text[]
            USING CASE
                WHEN brand_exclusivity IS NULL OR btrim(brand_exclusivity) = '' THEN '{}'::text[]
                ELSE ARRAY[brand_exclusivity]
            END;
        ALTER TABLE public.creators ALTER COLUMN brand_exclusivity SET DEFAULT '{}'::text[];
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS creators_age_idx ON public.creators(age);
CREATE INDEX IF NOT EXISTS creators_race_idx ON public.creators(race);
CREATE INDEX IF NOT EXISTS creators_hair_color_idx ON public.creators(hair_color);
CREATE INDEX IF NOT EXISTS creators_hairstyle_idx ON public.creators(hairstyle);
CREATE INDEX IF NOT EXISTS creators_eye_color_idx ON public.creators(eye_color);
CREATE INDEX IF NOT EXISTS creators_height_cm_idx ON public.creators(height_cm);
CREATE INDEX IF NOT EXISTS creators_weight_kg_idx ON public.creators(weight_kg);
CREATE INDEX IF NOT EXISTS creators_facial_features_gin ON public.creators USING GIN (facial_features);
CREATE INDEX IF NOT EXISTS idx_creators_profile_avatar_id ON public.creators(profile_avatar_id);
CREATE INDEX IF NOT EXISTS idx_creators_stripe_customer_id ON public.creators(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_creators_plan_tier ON public.creators(plan_tier);
CREATE INDEX IF NOT EXISTS idx_creators_email ON public.creators(email);
CREATE INDEX IF NOT EXISTS idx_creators_platform_handle ON public.creators(platform_handle);
CREATE INDEX IF NOT EXISTS idx_creators_tiktok_handle ON public.creators(tiktok_handle);
CREATE INDEX IF NOT EXISTS idx_creators_visibility ON public.creators(visibility);
CREATE INDEX IF NOT EXISTS idx_creators_role ON public.creators(role);
CREATE INDEX IF NOT EXISTS idx_creators_content_types ON public.creators USING GIN (content_types);
CREATE INDEX IF NOT EXISTS idx_creators_industries ON public.creators USING GIN (industries);
CREATE INDEX IF NOT EXISTS idx_creators_brand_categories ON public.creators USING GIN (brand_categories);
CREATE INDEX IF NOT EXISTS idx_creators_work_types ON public.creators USING GIN (work_types);

ALTER TABLE public.agency_subscriptions
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.creator_agency_invites
    ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.agency_creator_marketplace_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_creator_agency_invites_contract_id
    ON public.creator_agency_invites(contract_id);

ALTER TABLE public.license_templates
    ADD COLUMN IF NOT EXISTS template_name text,
    ADD COLUMN IF NOT EXISTS category text,
    ADD COLUMN IF NOT EXISTS usage_scope text,
    ADD COLUMN IF NOT EXISTS modifications_allowed text,
    ADD COLUMN IF NOT EXISTS docuseal_template_id integer,
    ADD COLUMN IF NOT EXISTS client_name text,
    ADD COLUMN IF NOT EXISTS talent_name text,
    ADD COLUMN IF NOT EXISTS start_date date,
    ADD COLUMN IF NOT EXISTS contract_body text,
    ADD COLUMN IF NOT EXISTS contract_body_format text DEFAULT 'markdown';

ALTER TABLE public.license_templates
    ALTER COLUMN name DROP NOT NULL,
    ALTER COLUMN usage_type DROP NOT NULL;

UPDATE public.license_templates
SET template_name = COALESCE(NULLIF(btrim(template_name), ''), NULLIF(btrim(name), ''), 'License Template')
WHERE template_name IS NULL OR btrim(template_name) = '';

UPDATE public.license_templates
SET category = COALESCE(NULLIF(btrim(category), ''), NULLIF(btrim(usage_type), ''), 'general')
WHERE category IS NULL OR btrim(category) = '';

UPDATE public.license_templates
SET usage_scope = COALESCE(NULLIF(btrim(usage_scope), ''), NULLIF(btrim(usage_type), ''))
WHERE usage_scope IS NULL OR btrim(usage_scope) = '';

UPDATE public.license_templates
SET contract_body_format = 'markdown'
WHERE contract_body_format IS NULL OR btrim(contract_body_format) = '';

ALTER TABLE public.licensing_requests
    ADD COLUMN IF NOT EXISTS campaign_title text,
    ADD COLUMN IF NOT EXISTS client_name text,
    ADD COLUMN IF NOT EXISTS license_start_date date,
    ADD COLUMN IF NOT EXISTS license_end_date date,
    ADD COLUMN IF NOT EXISTS deadline date,
    ADD COLUMN IF NOT EXISTS regions text,
    ADD COLUMN IF NOT EXISTS negotiation_reason text,
    ADD COLUMN IF NOT EXISTS effective_end_date date,
    ADD COLUMN IF NOT EXISTS base_rate_monthly_cents bigint,
    ADD COLUMN IF NOT EXISTS offered_rate_monthly_cents bigint,
    ADD COLUMN IF NOT EXISTS rate_currency text DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS rate_source_type text,
    ADD COLUMN IF NOT EXISTS rate_source_id uuid;

UPDATE public.licensing_requests
SET campaign_title = COALESCE(NULLIF(btrim(campaign_title), ''), subject)
WHERE campaign_title IS NULL OR btrim(campaign_title) = '';

UPDATE public.licensing_requests
SET rate_currency = 'USD'
WHERE rate_currency IS NULL OR btrim(rate_currency) = '';

UPDATE public.licensing_requests
SET effective_end_date = COALESCE(license_end_date, deadline)
WHERE effective_end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_licensing_requests_deadline
    ON public.licensing_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_license_end_date
    ON public.licensing_requests(license_end_date);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_effective_end_date
    ON public.licensing_requests(effective_end_date);

ALTER TABLE public.conversations
    ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_agency_creator
    ON public.conversations(agency_id, creator_id);

ALTER TABLE public.agency_talent_invites
    ADD COLUMN IF NOT EXISTS invited_name text,
    ADD COLUMN IF NOT EXISTS responded_at timestamptz;

UPDATE public.agency_talent_invites
SET invited_name = full_name
WHERE invited_name IS NULL
    AND full_name IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.brand_license_requests'::regclass
            AND conname = 'brand_license_requests_submission_id_fkey'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.brand_license_requests'::regclass
                AND conname = 'fk_brand_license_requests_submission_id'
        ) THEN
            ALTER TABLE public.brand_license_requests
                RENAME CONSTRAINT fk_brand_license_requests_submission_id
                TO brand_license_requests_submission_id_fkey;
        ELSE
            ALTER TABLE public.brand_license_requests
                ADD CONSTRAINT brand_license_requests_submission_id_fkey
                FOREIGN KEY (submission_id)
                REFERENCES public.license_submissions(id)
                ON DELETE SET NULL
                NOT VALID;
        END IF;
    END IF;
END $$;

ALTER TABLE public.licensing_requests
    ADD COLUMN IF NOT EXISTS submission_id uuid;

CREATE INDEX IF NOT EXISTS idx_licensing_requests_submission
    ON public.licensing_requests(submission_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.licensing_requests'::regclass
            AND conname = 'licensing_requests_submission_id_fkey'
    ) THEN
        ALTER TABLE public.licensing_requests
            ADD CONSTRAINT licensing_requests_submission_id_fkey
            FOREIGN KEY (submission_id)
            REFERENCES public.license_submissions(id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;
END $$;

ALTER TABLE public.agency_payout_requests
    ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'instant',
    ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

UPDATE public.agency_payout_requests
SET payout_method = 'instant'
WHERE payout_method IS NULL OR btrim(payout_method) = '';

ALTER TABLE public.agency_payout_requests
    DROP CONSTRAINT IF EXISTS agency_payout_requests_status_check,
    ADD CONSTRAINT agency_payout_requests_status_check
        CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed'))
        NOT VALID;

ALTER TABLE public.creator_payout_requests
    ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'instant';

UPDATE public.creator_payout_requests
SET payout_method = 'instant'
WHERE payout_method IS NULL OR btrim(payout_method) = '';

ALTER TABLE public.creator_payout_requests
    DROP CONSTRAINT IF EXISTS creator_payout_requests_status_check,
    ADD CONSTRAINT creator_payout_requests_status_check
        CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed'))
        NOT VALID;

ALTER TABLE public.creator_custom_rates
    ADD COLUMN IF NOT EXISTS rate_name text,
    ADD COLUMN IF NOT EXISTS price_per_month_cents integer;

ALTER TABLE public.creator_custom_rates
    ALTER COLUMN rate_cents DROP NOT NULL,
    ALTER COLUMN rate_cents SET DEFAULT 0;

UPDATE public.creator_custom_rates
SET rate_name = COALESCE(NULLIF(btrim(rate_name), ''), initcap(replace(rate_type, '_', ' ')))
WHERE rate_name IS NULL OR btrim(rate_name) = '';

UPDATE public.creator_custom_rates
SET price_per_month_cents = COALESCE(price_per_month_cents, rate_cents)
WHERE price_per_month_cents IS NULL;

ALTER TABLE public.agency_talent_packages
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS cover_image_url text,
    ADD COLUMN IF NOT EXISTS primary_color text,
    ADD COLUMN IF NOT EXISTS secondary_color text,
    ADD COLUMN IF NOT EXISTS custom_message text,
    ADD COLUMN IF NOT EXISTS consent_items text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_favorites boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_callbacks boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS expires_at timestamptz,
    ADD COLUMN IF NOT EXISTS access_token text DEFAULT gen_random_uuid()::text,
    ADD COLUMN IF NOT EXISTS password_protected boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS password_hash text;

ALTER TABLE public.agency_talent_packages
    ALTER COLUMN name DROP NOT NULL,
    ALTER COLUMN access_token SET DEFAULT gen_random_uuid()::text;

UPDATE public.agency_talent_packages
SET title = COALESCE(NULLIF(btrim(title), ''), NULLIF(btrim(name), ''), 'Talent Package')
WHERE title IS NULL OR btrim(title) = '';

UPDATE public.agency_talent_packages
SET access_token = gen_random_uuid()::text
WHERE access_token IS NULL OR btrim(access_token) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_talent_packages_access_token
    ON public.agency_talent_packages(access_token);

ALTER TABLE public.agency_catalogs
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS licensing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS client_name text,
    ADD COLUMN IF NOT EXISTS client_email text,
    ADD COLUMN IF NOT EXISTS access_token text DEFAULT gen_random_uuid()::text,
    ADD COLUMN IF NOT EXISTS sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS notes text,
    ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.agency_catalogs
    ALTER COLUMN name DROP NOT NULL,
    ALTER COLUMN access_token SET DEFAULT gen_random_uuid()::text;

UPDATE public.agency_catalogs
SET title = COALESCE(NULLIF(btrim(title), ''), NULLIF(btrim(name), ''), 'Catalog')
WHERE title IS NULL OR btrim(title) = '';

UPDATE public.agency_catalogs
SET access_token = gen_random_uuid()::text
WHERE access_token IS NULL OR btrim(access_token) = '';

CREATE INDEX IF NOT EXISTS idx_agency_catalogs_licensing_request
    ON public.agency_catalogs(licensing_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_catalogs_access_token
    ON public.agency_catalogs(access_token);

ALTER TABLE public.organization_memberships
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));

ALTER TABLE public.organization_memberships
    ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.can_manage_organization_memberships(
    p_organization_type TEXT,
    p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_memberships om
        WHERE om.organization_type = p_organization_type
            AND om.organization_id = p_organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
            AND om.is_active = true
            AND COALESCE(om.status, 'active') = 'active'
    );
$$;

DROP POLICY IF EXISTS "Owners can manage memberships" ON public.organization_memberships;
CREATE POLICY "Owners can manage memberships" ON public.organization_memberships
    FOR ALL USING (
        public.can_manage_organization_memberships(organization_type, organization_id)
    )
    WITH CHECK (
        public.can_manage_organization_memberships(organization_type, organization_id)
    );

NOTIFY pgrst, 'reload schema';

COMMIT;
