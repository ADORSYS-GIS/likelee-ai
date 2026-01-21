-- Minimal schema to support Agency Dashboard metrics

BEGIN;

-- Campaigns (one row per talent per campaign)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  name text,
  campaign_type text,
  brand_vertical text,
  talent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region text,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_agency ON public.campaigns(agency_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_at ON public.campaigns(start_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_talent ON public.campaigns(talent_user_id);

-- Enforce: a user can be a talent in at most one agency
CREATE UNIQUE INDEX IF NOT EXISTS ux_agency_users_talent_unique
  ON public.agency_users(user_id)
  WHERE role = 'talent';


-- Payments (earnings and status per booking)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  talent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id text,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('succeeded','pending','failed')),
  currency_code text NOT NULL DEFAULT 'USD',
  gross_cents integer NOT NULL DEFAULT 0 CHECK (gross_cents >= 0),
  talent_earnings_cents integer NOT NULL DEFAULT 0 CHECK (talent_earnings_cents >= 0),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_agency ON public.payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_payments_talent ON public.payments(talent_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

-- Licensing requests
CREATE TABLE IF NOT EXISTS public.licensing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  talent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_agency ON public.licensing_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_licensing_requests_status ON public.licensing_requests(status);

-- Brand licenses: attach agency/talent and compliance flag
ALTER TABLE IF EXISTS public.brand_licenses
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS talent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'none' CHECK (compliance_status IN ('none','issue','resolved')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_brand_licenses_agency ON public.brand_licenses(agency_id);
CREATE INDEX IF NOT EXISTS idx_brand_licenses_talent ON public.brand_licenses(talent_user_id);
CREATE INDEX IF NOT EXISTS idx_brand_licenses_end_at ON public.brand_licenses(end_at);

-- Activity events (recent activity feed)
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject_table text,
  subject_id uuid,
  title text,
  subtitle text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_events_agency_created ON public.activity_events(agency_id, created_at DESC);

-- RLS (enabled; service role bypasses)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

COMMIT;
