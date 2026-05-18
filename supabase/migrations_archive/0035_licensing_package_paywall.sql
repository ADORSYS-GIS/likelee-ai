BEGIN;

-- Client licensing (Stripe subscription) to unlock public package assets
CREATE TABLE IF NOT EXISTS public.licensing_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
  package_access_token text NOT NULL,
  client_email text,
  stripe_customer_id text,
  stripe_checkout_session_id text NOT NULL,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','completed','expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_licensing_checkout_sessions_stripe_session
  ON public.licensing_checkout_sessions(stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_licensing_checkout_sessions_stripe_subscription
  ON public.licensing_checkout_sessions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_licensing_checkout_sessions_package_token
  ON public.licensing_checkout_sessions(package_access_token);
CREATE INDEX IF NOT EXISTS idx_licensing_checkout_sessions_package_id
  ON public.licensing_checkout_sessions(package_id);
CREATE INDEX IF NOT EXISTS idx_licensing_checkout_sessions_agency_id
  ON public.licensing_checkout_sessions(agency_id);


CREATE TABLE IF NOT EXISTS public.licensing_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.agency_talent_packages(id) ON DELETE CASCADE,
  package_access_token text NOT NULL,
  client_email text,
  scope text NOT NULL DEFAULT 'package_assets' CHECK (scope IN ('package_assets')),
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text,
  stripe_status text NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_licensing_access_grants_package_token
  ON public.licensing_access_grants(package_access_token);
CREATE INDEX IF NOT EXISTS idx_licensing_access_grants_package_id
  ON public.licensing_access_grants(package_id);
CREATE INDEX IF NOT EXISTS idx_licensing_access_grants_agency_id
  ON public.licensing_access_grants(agency_id);

ALTER TABLE public.licensing_checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing_access_grants ENABLE ROW LEVEL SECURITY;

-- No public policies: backend uses service_role key for access.

COMMIT;
