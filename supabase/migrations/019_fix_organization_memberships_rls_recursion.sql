-- Fix organization_memberships RLS recursion.
--
-- The old "Owners can manage memberships" policy queried organization_memberships
-- directly while Postgres was evaluating policies for organization_memberships,
-- which triggers SQLSTATE 42P17: infinite recursion detected in policy.
begin;

-- Forward-port schema edits that were added to earlier consolidated migrations
-- after some databases had already run them.
alter table public.creators
add column if not exists full_name text,
add column if not exists email text,
add column if not exists city text,
add column if not exists state text,
add column if not exists profile_photo_url text,
add column if not exists profile_avatar_id uuid default gen_random_uuid (),
add column if not exists age integer,
add column if not exists race text,
add column if not exists hair_color text,
add column if not exists hairstyle text,
add column if not exists eye_color text,
add column if not exists height_cm integer,
add column if not exists weight_kg integer,
add column if not exists facial_features text[],
add column if not exists tagline text,
add column if not exists bio text,
add column if not exists portfolio_link text,
add column if not exists public_profile_visible boolean default false,
add column if not exists kyc_status text default 'not_started',
add column if not exists liveness_status text default 'not_started',
add column if not exists kyc_provider text,
add column if not exists kyc_session_id text,
add column if not exists verified_at timestamptz,
add column if not exists kyc_rejection_reason text,
add column if not exists kyc_rejection_code text,
add column if not exists plan_tier text default 'free',
add column if not exists plan_interval text default 'month',
add column if not exists plan_updated_at timestamptz,
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists stripe_connect_account_id text,
add column if not exists payouts_enabled boolean default false,
add column if not exists last_payout_error text,
add column if not exists trial_started_at timestamptz,
add column if not exists subscription_current_period_end timestamptz,
add column if not exists onboarding_step text default 'email_verification',
add column if not exists onboarding_completed boolean default false,
add column if not exists licensing_rate_weekly_cents bigint,
add column if not exists licensing_rate_monthly_cents bigint,
add column if not exists accept_negotiations boolean default true,
add column if not exists rate_currency text default 'USD',
add column if not exists currency_code text default 'USD',
add column if not exists creatify_api_key text,
add column if not exists creatify_account_id text,
add column if not exists creatify_webhook_secret text,
add column if not exists creatify_job_id text,
add column if not exists creatify_job_status text default 'idle',
add column if not exists creatify_avatar_status text default 'not_created',
add column if not exists creatify_output_url text,
add column if not exists creatify_last_error text,
add column if not exists instagram_handle text,
add column if not exists instagram_followers bigint default 0,
add column if not exists instagram_connected boolean default false,
add column if not exists instagram_engagement_rate numeric(5, 2),
add column if not exists instagram_last_synced_at timestamptz,
add column if not exists birthdate date,
add column if not exists gender text,
add column if not exists creator_type text,
add column if not exists role text default 'creator',
add column if not exists athlete_type text,
add column if not exists platform_handle text,
add column if not exists primary_platform text,
add column if not exists tiktok_handle text,
add column if not exists twitter_handle text,
add column if not exists content_restrictions text[] default '{}',
add column if not exists brand_exclusivity text[] default '{}',
add column if not exists visibility text default 'private',
add column if not exists status text default 'waitlist',
add column if not exists content_types text[] default '{}',
add column if not exists content_other text,
add column if not exists industries text[] default '{}',
add column if not exists brand_categories text[] default '{}',
add column if not exists work_types text[] default '{}',
add column if not exists vibes text[] default '{}',
add column if not exists representation_status text,
add column if not exists headshot_url text,
add column if not exists sport text,
add column if not exists school_name text,
add column if not exists languages text,
add column if not exists base_monthly_price_cents integer default 0,
add column if not exists base_weekly_price_cents integer default 0,
add column if not exists pricing_updated_at timestamptz,
add column if not exists trial_basic_started_at timestamptz,
add column if not exists trial_pro_started_at timestamptz,
add column if not exists stripe_current_period_end timestamptz,
add column if not exists stripe_cancel_at_period_end boolean default false,
add column if not exists is_public_brands boolean default true,
add column if not exists cameo_front_url text,
add column if not exists cameo_back_url text,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

update public.creators
set role = 'creator'
where
  role is null
  or btrim(role) = '';

do $$
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

do $$
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

do $$
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

create index IF not exists creators_age_idx on public.creators (age);

create index IF not exists creators_race_idx on public.creators (race);

create index IF not exists creators_hair_color_idx on public.creators (hair_color);

create index IF not exists creators_hairstyle_idx on public.creators (hairstyle);

create index IF not exists creators_eye_color_idx on public.creators (eye_color);

create index IF not exists creators_height_cm_idx on public.creators (height_cm);

create index IF not exists creators_weight_kg_idx on public.creators (weight_kg);

create index IF not exists creators_facial_features_gin on public.creators using GIN (facial_features);

create index IF not exists idx_creators_profile_avatar_id on public.creators (profile_avatar_id);

create index IF not exists idx_creators_stripe_customer_id on public.creators (stripe_customer_id);

create index IF not exists idx_creators_plan_tier on public.creators (plan_tier);

create index IF not exists idx_creators_email on public.creators (email);

create index IF not exists idx_creators_platform_handle on public.creators (platform_handle);

create index IF not exists idx_creators_tiktok_handle on public.creators (tiktok_handle);

create index IF not exists idx_creators_visibility on public.creators (visibility);

create index IF not exists idx_creators_role on public.creators (role);

create index IF not exists idx_creators_content_types on public.creators using GIN (content_types);

create index IF not exists idx_creators_industries on public.creators using GIN (industries);

create index IF not exists idx_creators_brand_categories on public.creators using GIN (brand_categories);

create index IF not exists idx_creators_work_types on public.creators using GIN (work_types);

alter table public.agency_subscriptions
add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.agency_creator_marketplace_contracts
add column if not exists invite_id uuid references public.creator_agency_invites (id) on delete set null,
add column if not exists template_id uuid references public.license_templates (id) on delete set null,
add column if not exists template_name text,
add column if not exists contract_body text default '',
add column if not exists contract_body_format text default 'markdown',
add column if not exists rendered_contract_body text,
add column if not exists valid_from date,
add column if not exists valid_until date,
add column if not exists placeholder_values jsonb default '{}'::jsonb,
add column if not exists docuseal_submission_id integer,
add column if not exists docuseal_template_id integer,
add column if not exists docuseal_status text default 'draft',
add column if not exists agency_submitter_id bigint,
add column if not exists agency_submitter_slug text,
add column if not exists agency_embed_src text,
add column if not exists creator_submitter_id bigint,
add column if not exists creator_submitter_slug text,
add column if not exists signed_document_url text,
add column if not exists sent_at timestamptz,
add column if not exists last_synced_at timestamptz;

alter table public.agency_creator_marketplace_contracts
alter column contract_body
set default '',
alter column contract_body_format
set default 'markdown',
alter column placeholder_values
set default '{}'::jsonb,
alter column docuseal_status
set default 'draft';

update public.agency_creator_marketplace_contracts
set
  contract_body = ''
where
  contract_body is null;

update public.agency_creator_marketplace_contracts
set
  contract_body_format = 'markdown'
where
  contract_body_format is null
  or btrim(contract_body_format) = '';

update public.agency_creator_marketplace_contracts
set
  placeholder_values = '{}'::jsonb
where
  placeholder_values is null;

update public.agency_creator_marketplace_contracts
set
  docuseal_status = 'draft'
where
  docuseal_status is null
  or btrim(docuseal_status) = '';

alter table public.agency_creator_marketplace_contracts
drop constraint IF exists agency_creator_marketplace_contracts_status_check,
add constraint agency_creator_marketplace_contracts_status_check check (
  status in (
    'pending',
    'active',
    'paused',
    'terminated',
    'disconnected',
    'draft',
    'pending_signature',
    'expired',
    'declined',
    'voided'
  )
) not VALID;

alter table public.agency_creator_marketplace_contracts
drop constraint IF exists agency_creator_marketplace_contracts_contract_body_format_check,
add constraint agency_creator_marketplace_contracts_contract_body_format_check check (contract_body_format in ('markdown', 'html')) not VALID;

alter table public.agency_creator_marketplace_contracts
drop constraint IF exists agency_creator_marketplace_contracts_valid_window_check,
add constraint agency_creator_marketplace_contracts_valid_window_check check (
  valid_from is null
  or valid_until is null
  or valid_until >= valid_from
) not VALID;

create index IF not exists idx_agency_creator_marketplace_contracts_agency_creator on public.agency_creator_marketplace_contracts (agency_id, creator_id, created_at desc);

create index IF not exists idx_agency_creator_marketplace_contracts_creator_status on public.agency_creator_marketplace_contracts (creator_id, status, created_at desc);

create index IF not exists idx_agency_creator_marketplace_contracts_invite on public.agency_creator_marketplace_contracts (invite_id);

create index IF not exists idx_agency_creator_marketplace_contracts_docuseal_submission on public.agency_creator_marketplace_contracts (docuseal_submission_id);

alter table public.creator_agency_invites
add column if not exists contract_id uuid references public.agency_creator_marketplace_contracts (id) on delete set null;

create index IF not exists idx_creator_agency_invites_contract_id on public.creator_agency_invites (contract_id);

alter table public.license_templates
add column if not exists template_name text,
add column if not exists category text,
add column if not exists usage_scope text,
add column if not exists modifications_allowed text,
add column if not exists docuseal_template_id integer,
add column if not exists client_name text,
add column if not exists talent_name text,
add column if not exists start_date date,
add column if not exists contract_body text,
add column if not exists contract_body_format text default 'markdown';

alter table public.license_templates
alter column name
drop not null,
alter column usage_type
drop not null;

alter table public.license_templates
alter column license_fee
drop not null,
alter column license_fee
set default 0;

update public.license_templates
set
  usage_count = 0
where
  usage_count is null;

alter table public.license_templates
alter column usage_count
set default 0,
alter column usage_count
set not null;

update public.license_templates
set
  template_name = COALESCE(
    NULLIF(btrim(template_name), ''),
    NULLIF(btrim(name), ''),
    'License Template'
  )
where
  template_name is null
  or btrim(template_name) = '';

update public.license_templates
set
  category = COALESCE(
    NULLIF(btrim(category), ''),
    NULLIF(btrim(usage_type), ''),
    'general'
  )
where
  category is null
  or btrim(category) = '';

update public.license_templates
set
  usage_scope = COALESCE(
    NULLIF(btrim(usage_scope), ''),
    NULLIF(btrim(usage_type), '')
  )
where
  usage_scope is null
  or btrim(usage_scope) = '';

update public.license_templates
set
  contract_body_format = 'markdown'
where
  contract_body_format is null
  or btrim(contract_body_format) = '';

alter table public.licensing_requests
add column if not exists campaign_title text,
add column if not exists client_name text,
add column if not exists license_start_date date,
add column if not exists license_end_date date,
add column if not exists deadline date,
add column if not exists regions text,
add column if not exists negotiation_reason text,
add column if not exists effective_end_date date,
add column if not exists base_rate_monthly_cents bigint,
add column if not exists offered_rate_monthly_cents bigint,
add column if not exists rate_currency text default 'USD',
add column if not exists rate_source_type text,
add column if not exists rate_source_id uuid;

update public.licensing_requests
set
  campaign_title = COALESCE(NULLIF(btrim(campaign_title), ''), subject)
where
  campaign_title is null
  or btrim(campaign_title) = '';

update public.licensing_requests
set
  rate_currency = 'USD'
where
  rate_currency is null
  or btrim(rate_currency) = '';

update public.licensing_requests
set
  effective_end_date = COALESCE(license_end_date, deadline)
where
  effective_end_date is null;

create index IF not exists idx_licensing_requests_deadline on public.licensing_requests (deadline);

create index IF not exists idx_licensing_requests_license_end_date on public.licensing_requests (license_end_date);

create index IF not exists idx_licensing_requests_effective_end_date on public.licensing_requests (effective_end_date);

alter table public.conversations
add column if not exists agency_id uuid references public.agencies (id) on delete CASCADE,
add column if not exists creator_id uuid references public.creators (id) on delete CASCADE;

create index IF not exists idx_conversations_agency_creator on public.conversations (agency_id, creator_id);

alter table public.agency_talent_invites
add column if not exists invited_name text,
add column if not exists responded_at timestamptz;

alter table public.agency_talent_invites
alter column expires_at set default (now() + interval '7 days');

update public.agency_talent_invites
set expires_at = coalesce(created_at, now()) + interval '7 days'
where expires_at is null;

update public.agency_talent_invites
set
  invited_name = full_name
where
  invited_name is null
  and full_name is not null;

do $$
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

alter table public.licensing_requests
add column if not exists submission_id uuid;

create index IF not exists idx_licensing_requests_submission on public.licensing_requests (submission_id);

do $$
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

alter table public.agency_payout_requests
add column if not exists payout_method text default 'instant',
add column if not exists stripe_transfer_id text;

update public.agency_payout_requests
set
  payout_method = 'instant'
where
  payout_method is null
  or btrim(payout_method) = '';

alter table public.agency_payout_requests
drop constraint IF exists agency_payout_requests_status_check,
add constraint agency_payout_requests_status_check check (
  status in (
    'pending',
    'approved',
    'processing',
    'completed',
    'failed'
  )
) not VALID;

alter table public.creator_payout_requests
add column if not exists payout_method text default 'instant';

update public.creator_payout_requests
set
  payout_method = 'instant'
where
  payout_method is null
  or btrim(payout_method) = '';

alter table public.creator_payout_requests
drop constraint IF exists creator_payout_requests_status_check,
add constraint creator_payout_requests_status_check check (
  status in (
    'pending',
    'approved',
    'processing',
    'completed',
    'failed'
  )
) not VALID;

alter table public.creator_custom_rates
add column if not exists rate_name text,
add column if not exists price_per_month_cents integer;

alter table public.creator_custom_rates
alter column rate_cents
drop not null,
alter column rate_cents
set default 0;

update public.creator_custom_rates
set
  rate_name = COALESCE(
    NULLIF(btrim(rate_name), ''),
    initcap(replace(rate_type, '_', ' '))
  )
where
  rate_name is null
  or btrim(rate_name) = '';

update public.creator_custom_rates
set
  price_per_month_cents = COALESCE(price_per_month_cents, rate_cents)
where
  price_per_month_cents is null;

alter table public.agency_talent_packages
add column if not exists title text,
add column if not exists cover_image_url text,
add column if not exists primary_color text,
add column if not exists secondary_color text,
add column if not exists custom_message text,
add column if not exists consent_items text[] default '{}',
add column if not exists allow_comments boolean default true,
add column if not exists allow_favorites boolean default true,
add column if not exists allow_callbacks boolean default true,
add column if not exists expires_at timestamptz,
add column if not exists access_token text default gen_random_uuid ()::text,
add column if not exists password_protected boolean default false,
add column if not exists password_hash text;

alter table public.agency_talent_packages
alter column name
drop not null,
alter column access_token
set default gen_random_uuid ()::text;

update public.agency_talent_packages
set
  title = COALESCE(
    NULLIF(btrim(title), ''),
    NULLIF(btrim(name), ''),
    'Talent Package'
  )
where
  title is null
  or btrim(title) = '';

update public.agency_talent_packages
set
  access_token = gen_random_uuid ()::text
where
  access_token is null
  or btrim(access_token) = '';

create unique INDEX IF not exists idx_agency_talent_packages_access_token on public.agency_talent_packages (access_token);

create or replace function public.set_agency_talent_package_item_agency_id () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
set
  search_path = public as $$
DECLARE
    v_agency_id uuid;
BEGIN
    SELECT p.agency_id
    INTO v_agency_id
    FROM public.agency_talent_packages p
    WHERE p.id = NEW.package_id;

    IF v_agency_id IS NULL THEN
        RAISE EXCEPTION 'Package % does not exist or has no agency_id', NEW.package_id;
    END IF;

    NEW.agency_id := v_agency_id;
    RETURN NEW;
END;
$$;

drop trigger IF exists set_agency_talent_package_item_agency_id on public.agency_talent_package_items;

create trigger set_agency_talent_package_item_agency_id BEFORE INSERT
or
update OF package_id on public.agency_talent_package_items for EACH row
execute FUNCTION public.set_agency_talent_package_item_agency_id ();

alter table public.agency_talent_package_item_assets
add column if not exists asset_id uuid,
alter column storage_bucket
drop not null,
alter column storage_path
drop not null;

alter table public.agency_talent_package_item_assets
drop constraint IF exists agency_talent_package_item_assets_asset_id_fkey;

create index IF not exists idx_agency_talent_package_item_assets_asset on public.agency_talent_package_item_assets (asset_id);

alter table public.agency_talent_package_interactions
add column if not exists talent_id text,
add column if not exists "type" text,
add column if not exists content text,
add column if not exists client_name text,
add column if not exists client_email text,
add column if not exists interaction_data jsonb default '{}'::jsonb;

create index IF not exists idx_agency_talent_package_interactions_talent on public.agency_talent_package_interactions (talent_id);

update public.agency_talent_package_interactions
set
  "type" = interaction_type
where
  "type" is null;

update public.agency_talent_package_interactions
set
  content = request_message
where
  content is null
  and request_message is not null;

update public.agency_talent_package_interactions
set
  interaction_data = COALESCE(interaction_data, '{}'::jsonb)
where
  interaction_data is null;

alter table public.agency_talent_package_interactions
drop constraint IF exists agency_talent_package_interactions_interaction_type_check,
add constraint agency_talent_package_interactions_interaction_type_check check (
  interaction_type in (
    'view',
    'share',
    'download',
    'interest',
    'asset_request',
    'favorite',
    'callback',
    'selected',
    'consent',
    'comment'
  )
);

alter table public.agency_talent_package_interactions
drop constraint IF exists agency_talent_package_interactions_interaction_type_check,
add constraint agency_talent_package_interactions_interaction_type_check check (
  interaction_type in (
    'view',
    'share',
    'download',
    'interest',
    'asset_request',
    'favorite',
    'callback',
    'selected',
    'consent',
    'comment'
  )
);

create or replace function public.normalize_agency_talent_package_interaction () RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
set
  search_path = public as $$
BEGIN
    NEW.interaction_type := COALESCE(NULLIF(NEW.interaction_type, ''), NULLIF(NEW."type", ''));
    NEW."type" := COALESCE(NULLIF(NEW."type", ''), NEW.interaction_type);
    NEW.request_message := COALESCE(NEW.request_message, NEW.content);
    NEW.content := COALESCE(NEW.content, NEW.request_message);
    NEW.interaction_data := COALESCE(NEW.interaction_data, '{}'::jsonb);
    IF NEW.talent_id IS NULL AND NEW.creator_id IS NOT NULL AND NEW.package_id IS NOT NULL THEN
        SELECT it.talent_id::text
        INTO NEW.talent_id
        FROM public.agency_talent_package_items it
        WHERE it.package_id = NEW.package_id
          AND it.creator_id = NEW.creator_id
          AND it.talent_id IS NOT NULL
        ORDER BY it.sort_order ASC, it.created_at ASC
        LIMIT 1;
    END IF;

    IF NEW.talent_id IS NULL AND NEW.creator_id IS NOT NULL AND NEW.package_id IS NOT NULL THEN
        SELECT au.id::text
        INTO NEW.talent_id
        FROM public.agency_users au
        JOIN public.agency_talent_packages p ON p.id = NEW.package_id
        WHERE au.creator_id = NEW.creator_id
          AND au.agency_id = p.agency_id
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

drop trigger IF exists normalize_agency_talent_package_interaction on public.agency_talent_package_interactions;

create trigger normalize_agency_talent_package_interaction BEFORE INSERT
or
update on public.agency_talent_package_interactions for EACH row
execute FUNCTION public.normalize_agency_talent_package_interaction ();

create or replace function public.upsert_interaction (interaction_data jsonb) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
set
  search_path = public as $$
DECLARE
    v_interaction_id UUID;
    v_package_id UUID;
    v_creator_id UUID;
    v_item_id UUID;
    v_interaction_type TEXT;
    v_request_message TEXT;
BEGIN
    v_package_id := NULLIF(interaction_data->>'package_id', '')::uuid;
    v_creator_id := CASE
        WHEN COALESCE(interaction_data->>'creator_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (interaction_data->>'creator_id')::uuid
        ELSE NULL
    END;
    v_item_id := CASE
        WHEN COALESCE(interaction_data->>'item_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (interaction_data->>'item_id')::uuid
        ELSE NULL
    END;
    v_interaction_type := COALESCE(NULLIF(interaction_data->>'interaction_type', ''), NULLIF(interaction_data->>'type', ''));
    v_request_message := COALESCE(interaction_data->>'request_message', interaction_data->>'content');

    INSERT INTO public.agency_talent_package_interactions (
        package_id, talent_id, creator_id, interaction_type, "type", item_id, request_message,
        content, client_name, client_email, interaction_data, ip_address, user_agent, referrer
    ) VALUES (
        v_package_id,
        NULLIF(interaction_data->>'talent_id', ''),
        v_creator_id,
        v_interaction_type,
        v_interaction_type,
        v_item_id,
        v_request_message,
        interaction_data->>'content',
        interaction_data->>'client_name',
        interaction_data->>'client_email',
        interaction_data,
        NULLIF(interaction_data->>'ip_address', '')::inet,
        interaction_data->>'user_agent',
        interaction_data->>'referrer'
    )
    RETURNING id INTO v_interaction_id;

    INSERT INTO public.agency_talent_package_stats (
        package_id, agency_id, view_count, share_count, download_count,
        interest_count, asset_request_count, updated_at
    )
    SELECT
        v_package_id, p.agency_id,
        CASE WHEN v_interaction_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type = 'share' THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type = 'download' THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type IN ('interest', 'favorite', 'callback', 'selected') THEN 1 ELSE 0 END,
        CASE WHEN v_interaction_type = 'asset_request' THEN 1 ELSE 0 END,
        now()
    FROM public.agency_talent_packages p
    WHERE p.id = v_package_id
    ON CONFLICT (package_id) DO UPDATE SET
        view_count = public.agency_talent_package_stats.view_count +
            CASE WHEN v_interaction_type = 'view' THEN 1 ELSE 0 END,
        share_count = public.agency_talent_package_stats.share_count +
            CASE WHEN v_interaction_type = 'share' THEN 1 ELSE 0 END,
        download_count = public.agency_talent_package_stats.download_count +
            CASE WHEN v_interaction_type = 'download' THEN 1 ELSE 0 END,
        interest_count = public.agency_talent_package_stats.interest_count +
            CASE WHEN v_interaction_type IN ('interest', 'favorite', 'callback', 'selected') THEN 1 ELSE 0 END,
        asset_request_count = public.agency_talent_package_stats.asset_request_count +
            CASE WHEN v_interaction_type = 'asset_request' THEN 1 ELSE 0 END,
        updated_at = now();

    RETURN v_interaction_id;
END;
$$;

create or replace function public.get_public_package_details (p_access_token TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER as $$
DECLARE
  result JSONB;
BEGIN
  SELECT
    jsonb_build_object(
      'id', p.id,
      'agency_id', p.agency_id,
      'name', p.name,
      'description', p.description,
      'cover_photo_url', p.cover_photo_url,
      'is_template', p.is_template,
      'price_cents', p.price_cents,
      'currency', p.currency,
      'category', p.category,
      'organization', p.organization,
      'sports', p.sports,
      'client_name', p.client_name,
      'client_email', p.client_email,
      'consent_required', p.consent_required,
      'consent_text', p.consent_text,
      'meta', p.meta,
      'is_active', p.is_active,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'agency', (
        SELECT jsonb_build_object('agency_name', a.agency_name, 'logo_url', a.logo_url)
        FROM public.agencies a
        WHERE a.id = p.agency_id
      ),
      'interactions', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'talent_id', i.talent_id,
            'creator_id', i.creator_id,
            'interaction_type', i.interaction_type,
            'type', COALESCE(i."type", i.interaction_type),
            'item_id', i.item_id,
            'request_message', i.request_message,
            'content', i.content,
            'client_name', i.client_name,
            'client_email', i.client_email,
            'interaction_data', i.interaction_data,
            'created_at', i.created_at
          )
        )
        FROM public.agency_talent_package_interactions i
        WHERE i.package_id = p.id
      ), '[]'::jsonb),
      'items', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', it.id,
            'talent_id', it.talent_id,
            'creator_id', it.creator_id,
            'relationship_id', it.relationship_id,
            'item_type', it.item_type,
            'title', it.title,
            'description', it.description,
            'price_cents', it.price_cents,
            'media_urls', it.media_urls,
            'sort_order', it.sort_order,
            'talent', COALESCE(
              (
                SELECT jsonb_build_object(
                  'id', u.id, 'stage_name', u.stage_name,
                  'full_legal_name', u.full_legal_name,
                  'full_name', COALESCE(u.stage_name, u.full_legal_name),
                  'profile_photo_url', u.profile_photo_url,
                  'bio_notes', u.bio_notes, 'city', u.city
                )
                FROM public.agency_users u WHERE u.id = it.talent_id
              ),
              (
                SELECT jsonb_build_object(
                  'id', c.id, 'full_name', c.full_name,
                  'stage_name', c.full_name,
                  'full_legal_name', c.full_name,
                  'profile_photo_url', c.profile_photo_url, 'city', c.city
                )
                FROM public.creators c WHERE c.id = it.creator_id
              )
            ),
            'creator', (
              SELECT jsonb_build_object(
                'id', c.id, 'full_name', c.full_name,
                'stage_name', c.full_name,
                'full_legal_name', c.full_name,
                'profile_photo_url', c.profile_photo_url, 'city', c.city
              )
              FROM public.creators c WHERE c.id = it.creator_id
            ),
            'assets', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', pa.id, 'asset_type', pa.asset_type,
                  'public_url', pa.public_url, 'sort_order', pa.sort_order
                ) ORDER BY pa.sort_order
              )
              FROM public.agency_talent_package_item_assets pa
              WHERE pa.item_id = it.id
            ), '[]'::jsonb)
          ) ORDER BY it.sort_order
        )
        FROM public.agency_talent_package_items it
        WHERE it.package_id = p.id
      ), '[]'::jsonb)
    )
    INTO result
  FROM public.agency_talent_packages p
  WHERE p.id = (
    SELECT package_id FROM public.agency_talent_package_interactions
    WHERE id = CASE
      WHEN p_access_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN p_access_token::uuid
      ELSE NULL
    END
    LIMIT 1
  ) OR p.access_token = p_access_token
    OR p.meta->>'access_token' = p_access_token;

  RETURN result;
END;
$$;

alter table public.agency_catalogs
add column if not exists title text,
add column if not exists licensing_request_id uuid references public.licensing_requests (id) on delete set null,
add column if not exists client_name text,
add column if not exists client_email text,
add column if not exists access_token text default gen_random_uuid ()::text,
add column if not exists sent_at timestamptz,
add column if not exists notes text,
add column if not exists expires_at timestamptz;

alter table public.agency_catalogs
alter column name
drop not null,
alter column access_token
set default gen_random_uuid ()::text;

update public.agency_catalogs
set
  title = COALESCE(
    NULLIF(btrim(title), ''),
    NULLIF(btrim(name), ''),
    'Catalog'
  )
where
  title is null
  or btrim(title) = '';

update public.agency_catalogs
set
  access_token = gen_random_uuid ()::text
where
  access_token is null
  or btrim(access_token) = '';

create index IF not exists idx_agency_catalogs_licensing_request on public.agency_catalogs (licensing_request_id);

create unique INDEX IF not exists idx_agency_catalogs_access_token on public.agency_catalogs (access_token);

alter table public.organization_memberships
add column if not exists status text default 'active' check (status in ('active', 'inactive', 'pending'));

alter table public.organization_memberships
add column if not exists email text;

update public.organization_memberships
set role = case
  when role = 'member' then 'project_manager'
  when role = 'viewer' then 'reviewer'
  else role
end
where role in ('member', 'viewer');

alter table public.organization_memberships
drop constraint if exists organization_memberships_role_check,
add constraint organization_memberships_role_check check (
  role in ('owner', 'admin', 'project_manager', 'reviewer')
) not valid;

alter table public.organization_invites
add column if not exists token_hash text;

update public.organization_invites
set role = case
  when role = 'member' then 'project_manager'
  when role = 'viewer' then 'reviewer'
  else role
end
where role in ('member', 'viewer');

alter table public.organization_invites
drop constraint if exists organization_invites_role_check,
add constraint organization_invites_role_check check (
  role in ('admin', 'project_manager', 'reviewer')
) not valid;

update public.organization_invites
set token_hash = encode(digest(token, 'sha256'), 'hex')
where
  token_hash is null
  and token is not null
  and btrim(token) <> '';

do $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'organization_invites'
            AND column_name = 'token'
    ) THEN
        ALTER TABLE public.organization_invites
            ALTER COLUMN token DROP NOT NULL;
    END IF;
END $$;

create unique index if not exists idx_organization_invites_token_hash
    on public.organization_invites (token_hash)
    where token_hash is not null;

alter table public.organization_audit_logs
add column if not exists actor_user_id text,
add column if not exists old_role text,
add column if not exists new_role text,
add column if not exists metadata jsonb default '{}'::jsonb;

update public.organization_audit_logs
set actor_user_id = coalesce(actor_user_id, actor_id::text)
where actor_user_id is null
  and actor_id is not null;

update public.organization_audit_logs
set metadata = coalesce(metadata, details, '{}'::jsonb)
where metadata is null;

alter table public.organization_audit_logs
alter column actor_type set default 'user';

create index if not exists idx_organization_audit_logs_actor
    on public.organization_audit_logs (actor_user_id);

alter table public.agency_users
add column if not exists sports text;

do $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'agency_users'
            AND column_name = 'ai_usage'
            AND data_type = 'boolean'
    ) THEN
        ALTER TABLE public.agency_users
            ALTER COLUMN ai_usage TYPE text[]
            USING CASE
                WHEN ai_usage IS TRUE THEN ARRAY['Image']::text[]
                ELSE '{}'::text[]
            END;
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'agency_users'
            AND column_name = 'ai_usage'
            AND data_type = 'text'
    ) THEN
        ALTER TABLE public.agency_users
            ALTER COLUMN ai_usage TYPE text[]
            USING CASE
                WHEN ai_usage IS NULL OR btrim(ai_usage) = '' THEN '{}'::text[]
                ELSE ARRAY[ai_usage]::text[]
            END;
    ELSIF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'agency_users'
            AND column_name = 'ai_usage'
    ) THEN
        ALTER TABLE public.agency_users
            ADD COLUMN ai_usage text[] DEFAULT '{}'::text[];
    END IF;
END $$;

create or replace function public.can_manage_organization_memberships (p_organization_type TEXT, p_organization_id UUID) RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
set
  search_path = public as $$
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

create or replace function public.has_organization_role (
  p_organization_type TEXT,
  p_organization_id UUID,
  p_user_id UUID,
  p_min_role TEXT
) RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
set
  search_path = public as $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_memberships
        WHERE organization_type = p_organization_type
            AND organization_id = p_organization_id
            AND user_id = p_user_id
            AND is_active = true
            AND (
                (p_min_role = 'reviewer' AND role IN ('owner', 'admin', 'project_manager', 'reviewer')) OR
                (p_min_role = 'project_manager' AND role IN ('owner', 'admin', 'project_manager')) OR
                (p_min_role = 'admin' AND role IN ('owner', 'admin')) OR
                (p_min_role = 'owner' AND role = 'owner')
            )
    );
$$;

drop policy IF exists "Owners can manage memberships" on public.organization_memberships;

create policy "Owners can manage memberships" on public.organization_memberships for all using (
  public.can_manage_organization_memberships (organization_type, organization_id)
)
with
  check (
    public.can_manage_organization_memberships (organization_type, organization_id)
  );

alter table public.agency_talent_relationships
add column if not exists licensing_rate_monthly_cents bigint;

drop index if exists public.uq_agency_talent_relationships_agency_talent;
create unique index if not exists uq_agency_talent_relationships_agency_talent
    on public.agency_talent_relationships (agency_id, talent_id);

drop index if exists public.uq_agency_talent_relationships_agency_creator;
create unique index if not exists uq_agency_talent_relationships_agency_creator
    on public.agency_talent_relationships (agency_id, creator_id);

do $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = 'license_submissions'
            AND column_name = 'docuseal_submission_id'
            AND data_type <> 'integer'
    ) THEN
        ALTER TABLE public.license_submissions
            ALTER COLUMN docuseal_submission_id TYPE integer
            USING CASE
                WHEN docuseal_submission_id IS NULL THEN NULL
                WHEN docuseal_submission_id::text ~ '^[0-9]+$' THEN docuseal_submission_id::text::integer
                ELSE NULL
            END;
    END IF;
END $$;

create index if not exists idx_license_submissions_docuseal_submission
    on public.license_submissions (docuseal_submission_id);

alter table public.license_submissions
drop constraint if exists license_submissions_status_check,
add constraint license_submissions_status_check check (
    status in (
        'draft',
        'pending',
        'sent',
        'opened',
        'under_review',
        'approved',
        'rejected',
        'signed',
        'declined',
        'archived',
        'completed',
        'converted',
        'agency_pending',
        'client_pending',
        'expired'
    )
) not valid;

drop policy if exists "Users can view their own agency profile" on public.agencies;
create policy "Users can view their own agency profile" on public.agencies
    for select using (
        auth.uid() = id
        or public.is_agency_team_member(id)
    );

drop policy if exists "Users can update their own agency profile" on public.agencies;
create policy "Users can update their own agency profile" on public.agencies
    for update using (
        auth.uid() = id
        or (
            public.is_agency_team_member(id)
            and public.has_organization_role('agency', id, auth.uid(), 'project_manager')
        )
    )
    with check (
        auth.uid() = id
        or (
            public.is_agency_team_member(id)
            and public.has_organization_role('agency', id, auth.uid(), 'project_manager')
        )
    );

drop policy if exists "Agencies can view their own members" on public.agency_users;
create policy "Agencies can view their own members" on public.agency_users
    for select using (
        agency_id = auth.uid()
        or (
            public.is_agency_team_member(agency_id)
            and public.has_organization_role('agency', agency_id, auth.uid(), 'reviewer')
        )
    );

drop policy if exists "Agencies can manage their own members" on public.agency_users;
create policy "Agencies can manage their own members" on public.agency_users
    for all using (
        agency_id = auth.uid()
        or (
            public.is_agency_team_member(agency_id)
            and public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    )
    with check (
        agency_id = auth.uid()
        or (
            public.is_agency_team_member(agency_id)
            and public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    );

drop policy if exists "Agencies can view their agency talent connections" on public.agency_talent_relationships;
create policy "Agencies can view their agency talent connections" on public.agency_talent_relationships
    for select using (
        agency_id = auth.uid()
        or (
            public.is_agency_team_member(agency_id)
            and public.has_organization_role('agency', agency_id, auth.uid(), 'reviewer')
        )
    );

drop policy if exists "Agencies can create their agency talent connections" on public.agency_talent_relationships;
create policy "Agencies can create their agency talent connections" on public.agency_talent_relationships
    for insert with check (
        agency_id = auth.uid()
        or (
            public.is_agency_team_member(agency_id)
            and public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    );

drop policy if exists "Agencies can update their agency talent connections" on public.agency_talent_relationships;
create policy "Agencies can update their agency talent connections" on public.agency_talent_relationships
    for update using (
        agency_id = auth.uid()
        or (
            public.is_agency_team_member(agency_id)
            and public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    )
    with check (
        agency_id = auth.uid()
        or (
            public.is_agency_team_member(agency_id)
            and public.has_organization_role('agency', agency_id, auth.uid(), 'project_manager')
        )
    );

drop policy if exists "Authenticated users can upload public storage objects" on storage.objects;
create policy "Authenticated users can upload public storage objects" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'likelee-public');

drop policy if exists "Authenticated users can update public storage objects" on storage.objects;
create policy "Authenticated users can update public storage objects" on storage.objects
    for update to authenticated
    using (bucket_id = 'likelee-public')
    with check (bucket_id = 'likelee-public');

drop policy if exists "Authenticated users can delete public storage objects" on storage.objects;
create policy "Authenticated users can delete public storage objects" on storage.objects
    for delete to authenticated
    using (bucket_id = 'likelee-public');

-- ============================================================================
-- license_submissions: fix agency_submitter_id and client_submitter_id
-- These columns may exist as uuid type from a previous broken migration.
-- We need them as bigint to store DocuSeal integer submitter IDs.
-- ============================================================================
do $$
BEGIN
    -- Fix agency_submitter_id: drop if uuid, re-add as bigint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'license_submissions'
          AND column_name = 'agency_submitter_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.license_submissions DROP COLUMN agency_submitter_id;
    END IF;

    -- Fix client_submitter_id: drop if uuid, re-add as bigint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'license_submissions'
          AND column_name = 'client_submitter_id'
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.license_submissions DROP COLUMN client_submitter_id;
    END IF;
END $$;

alter table public.license_submissions
add column if not exists agency_submitter_id bigint,
add column if not exists agency_submitter_slug text,
add column if not exists agency_embed_src text,
add column if not exists agency_signed_at timestamptz,
add column if not exists client_submitter_id bigint,
add column if not exists client_submitter_slug text,
add column if not exists requires_agency_signature boolean not null default false,
add column if not exists talent_id uuid references public.agency_users (id) on delete set null,
add column if not exists talent_ids uuid[],
add column if not exists archived_at timestamptz,
add column if not exists brand_request_id uuid references public.brand_license_requests (id) on delete set null,
add column if not exists brand_id uuid references public.brands (id) on delete set null,
add column if not exists client_company text,
add column if not exists project_name text,
add column if not exists proposed_price integer,
add column if not exists contract_url text,
add column if not exists payout_id uuid;

create index if not exists idx_license_submissions_agency_submitter_id on public.license_submissions (agency_submitter_id);
create index if not exists idx_license_submissions_talent on public.license_submissions (talent_id);
create index if not exists idx_license_submissions_brand_request on public.license_submissions (brand_request_id);

-- ============================================================================
-- licensing_requests: add columns missing from old DB
-- ============================================================================
alter table public.licensing_requests
add column if not exists talent_ids uuid[] default '{}',
add column if not exists archived_at timestamptz,
add column if not exists creator_id uuid references public.creators (id) on delete set null,
add column if not exists context_type text default 'licensing' check (context_type in ('licensing', 'campaign')),
add column if not exists campaign_offer_id uuid references public.campaign_offers (id) on delete cascade;

create index if not exists idx_licensing_requests_talent_ids on public.licensing_requests using gin (talent_ids);
create index if not exists idx_licensing_requests_creator on public.licensing_requests (creator_id);

-- ============================================================================
-- agency_talent_packages: add columns missing from old DB
-- (from 2026-03-03_package_consent.sql and 0015_consolidated_package_migrations)
-- ============================================================================

-- Fix consent_items: may exist as text[] from old migration, needs to be jsonb
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'agency_talent_packages'
          and column_name = 'consent_items'
          and data_type = 'array'
    ) then
        alter table public.agency_talent_packages
            alter column consent_items drop default;
        alter table public.agency_talent_packages
            alter column consent_items type jsonb
            using case
                when consent_items is null then '[]'::jsonb
                else to_jsonb(consent_items)
            end;
        alter table public.agency_talent_packages
            alter column consent_items set default '[]'::jsonb;
    end if;
end $$;

alter table public.agency_talent_packages
add column if not exists consent_items jsonb default '[]'::jsonb,
add column if not exists cover_image_url text,
add column if not exists expires_at timestamptz,
add column if not exists access_token text default gen_random_uuid()::text,
add column if not exists password_protected boolean default false,
add column if not exists password_hash text;

-- Backfill access_token for rows that don't have one
update public.agency_talent_packages
set access_token = gen_random_uuid()::text
where access_token is null or btrim(access_token) = '';

create unique index if not exists idx_agency_talent_packages_access_token_019
    on public.agency_talent_packages (access_token)
    where access_token is not null;

-- ============================================================================
-- Refresh get_public_package_details to include all fields
-- (title, cover_image_url, primary_color, consent_items, etc.)
-- ============================================================================
create or replace function public.get_public_package_details (p_access_token TEXT) returns jsonb language plpgsql security definer as $$
declare
  result jsonb;
begin
  select
    jsonb_build_object(
      'id', p.id,
      'agency_id', p.agency_id,
      'name', p.name,
      'title', coalesce(p.title, p.name),
      'description', p.description,
      'cover_photo_url', p.cover_photo_url,
      'cover_image_url', coalesce(p.cover_image_url, p.cover_photo_url),
      'primary_color', p.primary_color,
      'secondary_color', p.secondary_color,
      'custom_message', p.custom_message,
      'allow_comments', coalesce(p.allow_comments, true),
      'allow_favorites', coalesce(p.allow_favorites, true),
      'allow_callbacks', coalesce(p.allow_callbacks, true),
      'consent_required', p.consent_required,
      'consent_text', p.consent_text,
      'consent_items', coalesce(p.consent_items, '[]'::jsonb),
      'is_template', p.is_template,
      'price_cents', p.price_cents,
      'currency', p.currency,
      'category', p.category,
      'organization', p.organization,
      'sports', p.sports,
      'client_name', p.client_name,
      'client_email', p.client_email,
      'expires_at', p.expires_at,
      'access_token', p.access_token,
      'meta', p.meta,
      'is_active', p.is_active,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'agency', (
        select jsonb_build_object('agency_name', a.agency_name, 'logo_url', a.logo_url)
        from public.agencies a
        where a.id = p.agency_id
      ),
      'interactions', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'talent_id', i.talent_id,
            'creator_id', i.creator_id,
            'interaction_type', i.interaction_type,
            'type', coalesce(i."type", i.interaction_type),
            'item_id', i.item_id,
            'request_message', i.request_message,
            'content', i.content,
            'client_name', i.client_name,
            'client_email', i.client_email,
            'interaction_data', i.interaction_data,
            'created_at', i.created_at
          )
        )
        from public.agency_talent_package_interactions i
        where i.package_id = p.id
      ), '[]'::jsonb),
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', it.id,
            'talent_id', it.talent_id,
            'creator_id', it.creator_id,
            'relationship_id', it.relationship_id,
            'item_type', it.item_type,
            'title', it.title,
            'description', it.description,
            'price_cents', it.price_cents,
            'media_urls', it.media_urls,
            'sort_order', it.sort_order,
            'talent', coalesce(
              (
                select jsonb_build_object(
                  'id', u.id,
                  'stage_name', u.stage_name,
                  'full_legal_name', u.full_legal_name,
                  'full_name', coalesce(u.stage_name, u.full_legal_name),
                  'profile_photo_url', u.profile_photo_url,
                  'bio_notes', u.bio_notes,
                  'city', u.city
                )
                from public.agency_users u where u.id = it.talent_id
              ),
              (
                select jsonb_build_object(
                  'id', c.id,
                  'full_name', c.full_name,
                  'stage_name', c.full_name,
                  'full_legal_name', c.full_name,
                  'profile_photo_url', c.profile_photo_url,
                  'city', c.city
                )
                from public.creators c where c.id = it.creator_id
              )
            ),
            'assets', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', pa.id, 'asset_type', pa.asset_type,
                  'public_url', pa.public_url, 'sort_order', pa.sort_order
                ) order by pa.sort_order
              )
              from public.agency_talent_package_item_assets pa
              where pa.item_id = it.id
            ), '[]'::jsonb)
          ) order by it.sort_order
        )
        from public.agency_talent_package_items it
        where it.package_id = p.id
      ), '[]'::jsonb)
    )
    into result
  from public.agency_talent_packages p
  where p.access_token = p_access_token
     or p.meta->>'access_token' = p_access_token
     or p.id::text = p_access_token;

  return result;
end;
$$;

-- ============================================================================
-- agency_talent_package_items: backfill talent_id from agency_users where
-- creator_id is set but talent_id is null. This restores the original NOT NULL
-- behavior that resolveTalent in the frontend depends on.
-- ============================================================================

-- Add trigger to auto-fill talent_id from agency_users when only creator_id is set
create or replace function public.fill_package_item_talent_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if NEW.talent_id is null and NEW.creator_id is not null then
        select id into NEW.talent_id
        from public.agency_users
        where creator_id = NEW.creator_id
          and agency_id = NEW.agency_id
        limit 1;
    end if;
    return NEW;
end;
$$;

drop trigger if exists fill_package_item_talent_id on public.agency_talent_package_items;
create trigger fill_package_item_talent_id
    before insert or update on public.agency_talent_package_items
    for each row
    execute function public.fill_package_item_talent_id();

-- Backfill existing items
update public.agency_talent_package_items i
set talent_id = au.id
from public.agency_users au
where i.talent_id is null
  and i.creator_id is not null
  and au.creator_id = i.creator_id
  and au.agency_id = i.agency_id;

-- Backfill interactions: first use the package item identity, then fall back
-- to the matching agency_users row within the same agency.
update public.agency_talent_package_interactions i
set talent_id = it.talent_id::text
from public.agency_talent_package_items it
where i.package_id = it.package_id
  and i.creator_id is not null
  and i.creator_id = it.creator_id
  and i.talent_id is null
  and it.talent_id is not null;

update public.agency_talent_package_interactions i
set talent_id = au.id::text
from public.agency_users au,
     public.agency_talent_packages p
where i.talent_id is null
  and i.creator_id is not null
  and p.id = i.package_id
  and au.creator_id = i.creator_id
  and au.agency_id = p.agency_id;

-- ============================================================================
-- Fix missing columns from migration refactor
-- ============================================================================

-- Add missing columns to agency_payment_links
alter table public.agency_payment_links
add column if not exists licensing_request_id uuid references public.licensing_requests (id) on delete set null,
add column if not exists campaign_id uuid references public.campaigns (id) on delete set null,
add column if not exists stripe_payment_link_id text,
add column if not exists stripe_payment_link_url text,
add column if not exists total_amount_cents bigint,
add column if not exists net_amount_cents bigint,
add column if not exists agency_amount_cents bigint,
add column if not exists talent_amount_cents bigint,
add column if not exists agency_percent numeric(5,2),
add column if not exists talent_percent numeric(5,2),
add column if not exists talent_splits jsonb default '[]'::jsonb,
add column if not exists client_email text,
add column if not exists client_name text,
add column if not exists status text default 'active';

alter table public.agency_payment_links
alter column name drop not null,
alter column amount_cents drop not null,
alter column amount_cents set default 0,
alter column talent_splits set default '[]'::jsonb,
alter column status set default 'active';

update public.agency_payment_links
set amount_cents = coalesce(amount_cents, total_amount_cents, 0)
where amount_cents is null;

update public.agency_payment_links
set status = 'active'
where status is null or btrim(status) = '';

create index if not exists idx_agency_payment_links_licensing_request on public.agency_payment_links (licensing_request_id);
create index if not exists idx_agency_payment_links_campaign on public.agency_payment_links (campaign_id);
create index if not exists idx_agency_payment_links_stripe_payment_link_id on public.agency_payment_links (stripe_payment_link_id);
create index if not exists idx_agency_payment_links_status on public.agency_payment_links (status);
create index if not exists idx_agency_payment_links_client_email on public.agency_payment_links (client_email);

-- Add licensing_request_id to licensing_payouts
alter table public.licensing_payouts
add column if not exists licensing_request_id uuid references public.licensing_requests (id) on delete set null,
add column if not exists net_amount_cents bigint,
add column if not exists talent_earnings_cents bigint,
add column if not exists stripe_checkout_session_id text,
add column if not exists stripe_payment_intent_id text;

create index if not exists idx_licensing_payouts_licensing_request on public.licensing_payouts (licensing_request_id);
create index if not exists idx_licensing_payouts_stripe_checkout_session on public.licensing_payouts (stripe_checkout_session_id);
create index if not exists idx_licensing_payouts_stripe_payment_intent on public.licensing_payouts (stripe_payment_intent_id);

-- Add counts_toward_quota to storage_assets
alter table public.storage_assets
add column if not exists counts_toward_quota boolean default true,
add column if not exists source_table text,
add column if not exists source_id text,
add column if not exists created_by text;

create index if not exists idx_storage_assets_counts_toward_quota on public.storage_assets (counts_toward_quota);
create index if not exists idx_storage_assets_source on public.storage_assets (source_table, source_id);
create index if not exists idx_storage_assets_created_by on public.storage_assets (created_by);

-- Add missing columns to studio_generations
alter table public.studio_generations
add column if not exists user_id uuid,
add column if not exists campaign_id uuid;

create index if not exists idx_studio_generations_user on public.studio_generations (user_id);
create index if not exists idx_studio_generations_campaign on public.studio_generations (campaign_id);
create index if not exists idx_studio_generations_user_campaign on public.studio_generations (user_id, campaign_id);


-- Keep agency roster talent rows linked when a creator profile with the same email exists.
CREATE OR REPLACE FUNCTION public.sync_agency_user_creator_from_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.creator_id IS NULL AND NEW.email IS NOT NULL AND btrim(NEW.email) <> '' THEN
        SELECT c.id
        INTO NEW.creator_id
        FROM public.creators c
        WHERE lower(c.email) = lower(btrim(NEW.email))
        ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_agency_user_creator_from_email ON public.agency_users;
CREATE TRIGGER sync_agency_user_creator_from_email
    BEFORE INSERT OR UPDATE OF email, creator_id ON public.agency_users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_agency_user_creator_from_email();

CREATE OR REPLACE FUNCTION public.sync_creator_to_agency_users_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
        RETURN NEW;
    END IF;

    UPDATE public.agency_users au
    SET creator_id = NEW.id,
        updated_at = now()
    WHERE au.creator_id IS NULL
        AND au.email IS NOT NULL
        AND lower(au.email) = lower(btrim(NEW.email));

    UPDATE public.agency_talent_relationships r
    SET creator_id = au.creator_id,
        updated_at = now()
    FROM public.agency_users au
    WHERE r.creator_id IS NULL
        AND r.talent_id = au.id
        AND au.creator_id = NEW.id;

    INSERT INTO public.agency_talent_relationships (agency_id, talent_id, creator_id, status)
    SELECT au.agency_id, au.id, au.creator_id, 'active'
    FROM public.agency_users au
    WHERE au.creator_id = NEW.id
        AND au.role = 'talent'
        AND NOT EXISTS (
            SELECT 1
            FROM public.agency_talent_relationships r
            WHERE r.agency_id = au.agency_id
                AND r.talent_id = au.id
        )
        AND NOT EXISTS (
            SELECT 1
            FROM public.agency_talent_relationships r
            WHERE r.agency_id = au.agency_id
                AND r.creator_id = NEW.id
        );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_creator_to_agency_users_by_email ON public.creators;
CREATE TRIGGER sync_creator_to_agency_users_by_email
    AFTER INSERT OR UPDATE OF email ON public.creators
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_creator_to_agency_users_by_email();

UPDATE public.agency_users au
SET creator_id = (
    SELECT c.id
    FROM public.creators c
    WHERE c.email IS NOT NULL
        AND lower(c.email) = lower(btrim(au.email))
    ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC NULLS LAST
    LIMIT 1
),
updated_at = now()
WHERE au.creator_id IS NULL
    AND au.email IS NOT NULL
    AND btrim(au.email) <> ''
    AND EXISTS (
        SELECT 1
        FROM public.creators c
        WHERE c.email IS NOT NULL
            AND lower(c.email) = lower(btrim(au.email))
    );

UPDATE public.agency_talent_relationships r
SET creator_id = au.creator_id,
    updated_at = now()
FROM public.agency_users au
WHERE r.creator_id IS NULL
    AND r.talent_id = au.id
    AND au.creator_id IS NOT NULL;

INSERT INTO public.agency_talent_relationships (agency_id, talent_id, creator_id, status)
SELECT au.agency_id, au.id, au.creator_id, 'active'
FROM public.agency_users au
WHERE au.creator_id IS NOT NULL
    AND au.role = 'talent'
    AND NOT EXISTS (
        SELECT 1
        FROM public.agency_talent_relationships r
        WHERE r.agency_id = au.agency_id
            AND r.talent_id = au.id
    )
    AND NOT EXISTS (
        SELECT 1
        FROM public.agency_talent_relationships r
        WHERE r.agency_id = au.agency_id
            AND r.creator_id = au.creator_id
    );

notify pgrst,
'reload schema';

commit;