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
