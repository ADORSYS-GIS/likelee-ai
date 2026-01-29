
BEGIN;

-- 1. Add missing metrics and tracking columns to agency_users
ALTER TABLE IF EXISTS public.agency_users
    ADD COLUMN IF NOT EXISTS instagram_followers bigint DEFAULT 0,
    ADD COLUMN IF NOT EXISTS engagement_rate numeric(5,2) DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS total_assets integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS top_brand text,
    ADD COLUMN IF NOT EXISTS earnings_30d bigint DEFAULT 0,
    ADD COLUMN IF NOT EXISTS projected_earnings bigint DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_reminder_sent timestamptz,
    ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'Model',
    ADD COLUMN IF NOT EXISTS consent_status text DEFAULT 'missing',
    ADD COLUMN IF NOT EXISTS license_expiry date,
    ADD COLUMN IF NOT EXISTS bust_chest_inches integer,
    ADD COLUMN IF NOT EXISTS waist_inches integer,
    ADD COLUMN IF NOT EXISTS hips_inches integer,
    ADD COLUMN IF NOT EXISTS tattoos boolean,
    ADD COLUMN IF NOT EXISTS piercings boolean,
    ADD COLUMN IF NOT EXISTS is_verified_talent boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Add seats_limit to agencies
ALTER TABLE IF EXISTS public.agencies 
    ADD COLUMN IF NOT EXISTS seats_limit integer;

-- 3. Ensure Indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_agency_users_agency_id ON public.agency_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_users_role ON public.agency_users(role);
CREATE INDEX IF NOT EXISTS idx_agency_users_status ON public.agency_users(status);

-- 4. RLS policies if not already present
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can view their own members') THEN
        CREATE POLICY "Agencies can view their own members" ON public.agency_users
            FOR SELECT USING (agency_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can manage their own members') THEN
        CREATE POLICY "Agencies can manage their own members" ON public.agency_users
            FOR ALL USING (agency_id = auth.uid());
    END IF;
END $$;

-- 5. Create digitals table
CREATE TABLE IF NOT EXISTS public.digitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  photo_urls text[] NOT NULL DEFAULT '{}'::text[],

  height_feet integer,
  height_inches integer,
  weight_lbs integer,
  bust_inches integer,
  waist_inches integer,
  hips_inches integer,
  measurements text,

  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at date,
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current','expired','needs_update')),
  comp_card_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.digitals
  ADD COLUMN IF NOT EXISTS measurements text;

UPDATE public.digitals
SET measurements = (bust_inches::text || '-' || waist_inches::text || '-' || hips_inches::text)
WHERE measurements IS NULL
  AND bust_inches IS NOT NULL
  AND waist_inches IS NOT NULL
  AND hips_inches IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_digitals_talent_id ON public.digitals(talent_id);
CREATE INDEX IF NOT EXISTS idx_digitals_status ON public.digitals(status);
CREATE INDEX IF NOT EXISTS idx_digitals_updated_at ON public.digitals(updated_at DESC);

-- 6. Enable RLS on digitals
ALTER TABLE public.digitals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can view digitals for their talents') THEN
    CREATE POLICY "Agencies can view digitals for their talents" ON public.digitals
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.agency_users au
          WHERE au.id = talent_id
            AND au.agency_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can manage digitals for their talents') THEN
    CREATE POLICY "Agencies can manage digitals for their talents" ON public.digitals
      FOR ALL USING (
        EXISTS (
          SELECT 1
          FROM public.agency_users au
          WHERE au.id = talent_id
            AND au.agency_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.agency_users au
          WHERE au.id = talent_id
            AND au.agency_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 7. Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  name text,
  campaign_type text NOT NULL DEFAULT 'Photoshoot' CHECK (campaign_type IN ('Photoshoot','Event','Endorsement')),
  brand_vertical text,
  region text,
  start_at timestamptz,
  end_at timestamptz,
  date date,
  payment_amount numeric(12,2),
  agency_percent numeric(5,2) NOT NULL DEFAULT 0,
  talent_percent numeric(5,2) NOT NULL DEFAULT 100,
  agency_earnings_cents bigint NOT NULL DEFAULT 0,
  talent_earnings_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','Completed','Cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS public.campaigns
  ADD COLUMN IF NOT EXISTS agency_id uuid,
  ADD COLUMN IF NOT EXISTS talent_id uuid,
  ADD COLUMN IF NOT EXISTS brand_id uuid,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS campaign_type text,
  ADD COLUMN IF NOT EXISTS brand_vertical text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS date date,
  ADD COLUMN IF NOT EXISTS payment_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS agency_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS talent_percent numeric(5,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS agency_earnings_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS talent_earnings_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.campaigns
SET campaign_type = 'Photoshoot'
WHERE campaign_type IS NULL;

UPDATE public.campaigns
SET status = 'Pending'
WHERE status IS NULL;

ALTER TABLE public.campaigns
  ALTER COLUMN campaign_type SET DEFAULT 'Photoshoot';

ALTER TABLE public.campaigns
  ALTER COLUMN status SET DEFAULT 'Pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_talent_id_fkey'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_talent_id_fkey
      FOREIGN KEY (talent_id)
      REFERENCES public.agency_users(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_campaign_type_check'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE campaign_type IS NOT NULL
      AND campaign_type NOT IN ('Photoshoot','Event','Endorsement')
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_campaign_type_check
      CHECK (campaign_type IN ('Photoshoot','Event','Endorsement'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_status_check'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE status IS NOT NULL
      AND status NOT IN ('Pending','Confirmed','Completed','Cancelled')
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_status_check
      CHECK (status IN ('Pending','Confirmed','Completed','Cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_agency_percent_check'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE agency_percent IS NOT NULL
      AND (agency_percent < 0 OR agency_percent > 100)
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_agency_percent_check
      CHECK (agency_percent >= 0 AND agency_percent <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_talent_percent_check'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE talent_percent IS NOT NULL
      AND (talent_percent < 0 OR talent_percent > 100)
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_talent_percent_check
      CHECK (talent_percent >= 0 AND talent_percent <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_split_sum_check'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE (agency_percent + talent_percent) <> 100
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_split_sum_check
      CHECK ((agency_percent + talent_percent) = 100);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.campaigns_compute_earnings()
RETURNS trigger AS $$
DECLARE
  gross_cents bigint;
  talent_cents bigint;
  agency_cents bigint;
BEGIN
  gross_cents := COALESCE(ROUND(COALESCE(NEW.payment_amount, 0) * 100.0), 0);

  talent_cents := COALESCE(ROUND(gross_cents * (COALESCE(NEW.talent_percent, 0) / 100.0)), 0);
  agency_cents := gross_cents - talent_cents;

  NEW.talent_earnings_cents := COALESCE(talent_cents, 0);
  NEW.agency_earnings_cents := COALESCE(agency_cents, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'campaigns_compute_earnings_trigger'
  ) THEN
    CREATE TRIGGER campaigns_compute_earnings_trigger
    BEFORE INSERT OR UPDATE OF payment_amount, agency_percent, talent_percent
    ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.campaigns_compute_earnings();
  END IF;
END $$;

-- Backfill computed earnings for existing rows (fires trigger)
UPDATE public.campaigns
SET payment_amount = payment_amount;

CREATE INDEX IF NOT EXISTS idx_campaigns_talent_id ON public.campaigns(talent_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_date ON public.campaigns(date);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can view campaigns for their talents') THEN
    CREATE POLICY "Agencies can view campaigns for their talents" ON public.campaigns
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.agency_users au
          WHERE au.id = talent_id
            AND au.agency_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agencies can manage campaigns for their talents') THEN
    CREATE POLICY "Agencies can manage campaigns for their talents" ON public.campaigns
      FOR ALL USING (
        EXISTS (
          SELECT 1
          FROM public.agency_users au
          WHERE au.id = talent_id
            AND au.agency_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.agency_users au
          WHERE au.id = talent_id
            AND au.agency_id = auth.uid()
        )
      );
  END IF;
END $$;


