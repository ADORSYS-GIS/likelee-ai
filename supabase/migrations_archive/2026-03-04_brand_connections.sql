BEGIN;

-- Agency connection requests (brand -> agency)
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

CREATE INDEX IF NOT EXISTS idx_brand_agency_connection_requests_brand_id
  ON public.brand_agency_connection_requests (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connection_requests_agency_id
  ON public.brand_agency_connection_requests (agency_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connection_requests_status
  ON public.brand_agency_connection_requests (status);

DROP INDEX IF EXISTS public.uniq_brand_agency_connection_requests_pending;
CREATE UNIQUE INDEX uniq_brand_agency_connection_requests_pending
  ON public.brand_agency_connection_requests (brand_id, agency_id)
  WHERE status = 'pending';

ALTER TABLE public.brand_agency_connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view their agency connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Brands can view their agency connection requests"
  ON public.brand_agency_connection_requests
  FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view brand connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Agencies can view brand connection requests"
  ON public.brand_agency_connection_requests
  FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create agency connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Brands can create agency connection requests"
  ON public.brand_agency_connection_requests
  FOR INSERT
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can respond to pending brand connection requests" ON public.brand_agency_connection_requests;
CREATE POLICY "Agencies can respond to pending brand connection requests"
  ON public.brand_agency_connection_requests
  FOR UPDATE
  USING (agency_id = auth.uid() AND status = 'pending')
  WITH CHECK (agency_id = auth.uid() AND status IN ('accepted', 'declined'));

-- Persistent agency connections
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

CREATE INDEX IF NOT EXISTS idx_brand_agency_connections_brand_id
  ON public.brand_agency_connections (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connections_agency_id
  ON public.brand_agency_connections (agency_id);
CREATE INDEX IF NOT EXISTS idx_brand_agency_connections_status
  ON public.brand_agency_connections (status);

ALTER TABLE public.brand_agency_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view their agency connections" ON public.brand_agency_connections;
CREATE POLICY "Brands can view their agency connections"
  ON public.brand_agency_connections
  FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can view their brand connections" ON public.brand_agency_connections;
CREATE POLICY "Agencies can view their brand connections"
  ON public.brand_agency_connections
  FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Brands can disconnect agency connections" ON public.brand_agency_connections;
CREATE POLICY "Brands can disconnect agency connections"
  ON public.brand_agency_connections
  FOR UPDATE
  USING (brand_id = auth.uid())
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can disconnect brand connections" ON public.brand_agency_connections;
CREATE POLICY "Agencies can disconnect brand connections"
  ON public.brand_agency_connections
  FOR UPDATE
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Creator connection requests (brand -> creator)
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

CREATE INDEX IF NOT EXISTS idx_brand_creator_connection_requests_brand_id
  ON public.brand_creator_connection_requests (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connection_requests_creator_id
  ON public.brand_creator_connection_requests (creator_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connection_requests_status
  ON public.brand_creator_connection_requests (status);

DROP INDEX IF EXISTS public.uniq_brand_creator_connection_requests_pending;
CREATE UNIQUE INDEX uniq_brand_creator_connection_requests_pending
  ON public.brand_creator_connection_requests (brand_id, creator_id)
  WHERE status = 'pending';

ALTER TABLE public.brand_creator_connection_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view their creator connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Brands can view their creator connection requests"
  ON public.brand_creator_connection_requests
  FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view brand connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Creators can view brand connection requests"
  ON public.brand_creator_connection_requests
  FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Brands can create creator connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Brands can create creator connection requests"
  ON public.brand_creator_connection_requests
  FOR INSERT
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can respond to pending brand connection requests" ON public.brand_creator_connection_requests;
CREATE POLICY "Creators can respond to pending brand connection requests"
  ON public.brand_creator_connection_requests
  FOR UPDATE
  USING (creator_id = auth.uid() AND status = 'pending')
  WITH CHECK (creator_id = auth.uid() AND status IN ('accepted', 'declined'));

-- Persistent creator connections
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

CREATE INDEX IF NOT EXISTS idx_brand_creator_connections_brand_id
  ON public.brand_creator_connections (brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connections_creator_id
  ON public.brand_creator_connections (creator_id);
CREATE INDEX IF NOT EXISTS idx_brand_creator_connections_status
  ON public.brand_creator_connections (status);

ALTER TABLE public.brand_creator_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view creator connections" ON public.brand_creator_connections;
CREATE POLICY "Brands can view creator connections"
  ON public.brand_creator_connections
  FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view brand connections" ON public.brand_creator_connections;
CREATE POLICY "Creators can view brand connections"
  ON public.brand_creator_connections
  FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Brands can update creator connections" ON public.brand_creator_connections;
CREATE POLICY "Brands can update creator connections"
  ON public.brand_creator_connections
  FOR UPDATE
  USING (brand_id = auth.uid())
  WITH CHECK (brand_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update brand connections" ON public.brand_creator_connections;
CREATE POLICY "Creators can update brand connections"
  ON public.brand_creator_connections
  FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

COMMIT;
