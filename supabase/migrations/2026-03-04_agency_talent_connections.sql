BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_talent_lecense_rate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES public.agency_users(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'declined')),
  licensing_rate_weekly_cents bigint,
  accept_negotiations boolean NOT NULL DEFAULT true,
  rate_currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_talent_lecense_rate_agency_talent
  ON public.agency_talent_lecense_rate(agency_id, talent_id);

CREATE INDEX IF NOT EXISTS idx_agency_talent_lecense_rate_agency_status
  ON public.agency_talent_lecense_rate(agency_id, status);

CREATE INDEX IF NOT EXISTS idx_agency_talent_lecense_rate_talent_status
  ON public.agency_talent_lecense_rate(talent_id, status);

ALTER TABLE public.agency_talent_lecense_rate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their agency talent connections" ON public.agency_talent_lecense_rate;
CREATE POLICY "Agencies can view their agency talent connections"
  ON public.agency_talent_lecense_rate FOR SELECT
  USING (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agencies can create their agency talent connections" ON public.agency_talent_lecense_rate;
CREATE POLICY "Agencies can create their agency talent connections"
  ON public.agency_talent_lecense_rate FOR INSERT
  WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Agencies can update their agency talent connections" ON public.agency_talent_lecense_rate;
CREATE POLICY "Agencies can update their agency talent connections"
  ON public.agency_talent_lecense_rate FOR UPDATE
  USING (auth.uid() = agency_id)
  WITH CHECK (auth.uid() = agency_id);

DROP POLICY IF EXISTS "Creators can view their own active agency links" ON public.agency_talent_lecense_rate;
CREATE POLICY "Creators can view their own active agency links"
  ON public.agency_talent_lecense_rate FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update their own agency links" ON public.agency_talent_lecense_rate;
CREATE POLICY "Creators can update their own agency links"
  ON public.agency_talent_lecense_rate FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agency_talent_lecense_rate_licensing_rate_non_negative'
  ) THEN
    ALTER TABLE public.agency_talent_lecense_rate
      ADD CONSTRAINT agency_talent_lecense_rate_licensing_rate_non_negative
      CHECK (
        licensing_rate_weekly_cents IS NULL
        OR licensing_rate_weekly_cents >= 0
      );
  END IF;
END $$;

DO $$
DECLARE
  has_weekly_rate boolean;
  has_accept_negotiations boolean;
  has_rate_currency boolean;
  weekly_expr text;
  accept_expr text;
  currency_expr text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_users'
      AND column_name = 'licensing_rate_weekly_cents'
  ) INTO has_weekly_rate;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_users'
      AND column_name = 'accept_negotiations'
  ) INTO has_accept_negotiations;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_users'
      AND column_name = 'rate_currency'
  ) INTO has_rate_currency;

  weekly_expr := CASE
    WHEN has_weekly_rate THEN 'au.licensing_rate_weekly_cents'
    ELSE 'NULL'
  END;
  accept_expr := CASE
    WHEN has_accept_negotiations THEN 'COALESCE(au.accept_negotiations, true)'
    ELSE 'true'
  END;
  currency_expr := CASE
    WHEN has_rate_currency THEN 'COALESCE(NULLIF(TRIM(au.rate_currency), ''''), ''USD'')'
    ELSE '''USD'''
  END;

  EXECUTE format(
    $sql$
      INSERT INTO public.agency_talent_lecense_rate (
        agency_id,
        talent_id,
        creator_id,
        status,
        licensing_rate_weekly_cents,
        accept_negotiations,
        rate_currency,
        created_at,
        updated_at
      )
      SELECT
        au.agency_id,
        au.id AS talent_id,
        au.creator_id,
        CASE
          WHEN au.status IN ('active', 'inactive', 'pending') THEN au.status
          ELSE 'active'
        END AS status,
        %s,
        %s,
        %s,
        COALESCE(au.created_at, now()),
        COALESCE(au.updated_at, now())
      FROM public.agency_users au
      WHERE au.role = 'talent'
        AND au.agency_id IS NOT NULL
      ON CONFLICT (agency_id, talent_id) DO UPDATE
      SET
        creator_id = EXCLUDED.creator_id,
        licensing_rate_weekly_cents = EXCLUDED.licensing_rate_weekly_cents,
        accept_negotiations = EXCLUDED.accept_negotiations,
        rate_currency = EXCLUDED.rate_currency,
        status = EXCLUDED.status,
        updated_at = now()
    $sql$,
    weekly_expr,
    accept_expr,
    currency_expr
  );
END $$;

COMMIT;
