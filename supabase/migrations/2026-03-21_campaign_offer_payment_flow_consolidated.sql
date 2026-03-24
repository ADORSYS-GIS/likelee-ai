-- 2026-03-21_campaign_offer_payment_flow_consolidated.sql
-- Consolidated migration for the campaign-offer payment + deliverables + payout/distribution work.
-- This squashes the following (previously separate) migrations from this PR into one:
-- - 2026-03-16_brand_campaigns_avg_turnaround.sql
-- - 2026-03-16_brand_campaigns_mark_done.sql
-- - 2026-03-17_brand_activity_events_extend.sql
-- - 2026-03-17_campaign_offer_billing_stubs.sql
-- - 2026-03-18_fix_v_face_payouts_union.sql
-- - 2026-03-19_campaign_offers_escrow_status_releasing.sql
-- - 2026-03-19_lockdown_likelee_private_storage_access.sql
-- - 2026-03-20_stop_decrementing_internal_balances_on_connected_account_payouts.sql
--
-- NOTE: We intentionally do NOT rewrite older historical migrations already present on `main`.

BEGIN;

-- ---------------------------------------------------------------------------
-- Campaign deliverables: support intermediate brand approval state
-- (We avoid editing older historical migrations; instead, we adjust the check constraint here.)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'campaign_offer_deliverables'
  ) THEN
    ALTER TABLE public.campaign_offer_deliverables
      DROP CONSTRAINT IF EXISTS campaign_offer_deliverables_status_check;

    -- Defensive cleanup: if any legacy rows have unexpected `status` values, normalize them
    -- before re-applying the stricter CHECK constraint. We default to `submitted` because it
    -- is the safest non-final state.
    UPDATE public.campaign_offer_deliverables
    SET status = 'draft'
    WHERE status IS NULL
      OR status NOT IN (
        'draft',
        'submitted',
        'agency_review',
        'brand_review',
        'brand_approved',
        'changes_requested',
        'approved',
        'rejected'
      );

    ALTER TABLE public.campaign_offer_deliverables
      ADD CONSTRAINT campaign_offer_deliverables_status_check
      CHECK (
        status IN (
          'draft',
          'submitted',
          'agency_review',
          'brand_review',
          'brand_approved',
          'changes_requested',
          'approved',
          'rejected'
        )
      );

    ALTER TABLE public.campaign_offer_deliverables
      ALTER COLUMN status SET DEFAULT 'draft';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Brand campaign completion + activity feed
-- ---------------------------------------------------------------------------
ALTER TABLE public.brand_campaigns
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.brand_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject_table text,
  subject_id uuid,
  title text,
  subtitle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_activity_events
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.brand_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_type text,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS idx_brand_activity_events_brand_created
  ON public.brand_activity_events (brand_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_activity_events_campaign_created
  ON public.brand_activity_events (campaign_id, created_at DESC);

ALTER TABLE public.brand_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brands can view own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can view own activity events"
  ON public.brand_activity_events FOR SELECT
  USING (brand_id = auth.uid());

DROP POLICY IF EXISTS "Brands can insert own activity events" ON public.brand_activity_events;
CREATE POLICY "Brands can insert own activity events"
  ON public.brand_activity_events FOR INSERT
  WITH CHECK (brand_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Brand turnaround metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brand_avg_turnaround_hours(
  p_brand_id uuid,
  p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
      )
    )::integer,
    0
  )
  FROM public.brand_campaigns
  WHERE brand_id = p_brand_id
    AND completed_at IS NOT NULL
    AND completed_at >= start_date::timestamptz
    AND start_date >= date_trunc('month', p_month)::date
    AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

CREATE OR REPLACE FUNCTION public.industry_avg_turnaround_hours(
  p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
      )
    )::integer,
    0
  )
  FROM public.brand_campaigns
  WHERE completed_at IS NOT NULL
    AND completed_at >= start_date::timestamptz
    AND start_date >= date_trunc('month', p_month)::date
    AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

-- ---------------------------------------------------------------------------
-- Campaign offer billing stubs + escrow release tracking + transfer records
-- ---------------------------------------------------------------------------
ALTER TABLE public.licensing_requests
  ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'licensing'
    CHECK (context_type IN ('licensing', 'campaign')),
  ADD COLUMN IF NOT EXISTS campaign_offer_id uuid REFERENCES public.campaign_offers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_licensing_requests_campaign_offer_id
  ON public.licensing_requests(campaign_offer_id);

CREATE INDEX IF NOT EXISTS idx_licensing_requests_context_type
  ON public.licensing_requests(context_type);

ALTER TABLE public.campaign_offers
  ADD COLUMN IF NOT EXISTS billing_request_id uuid REFERENCES public.licensing_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'processing')),
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'holding',
  ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;

-- Ensure escrow status supports intermediate "releasing".
ALTER TABLE public.campaign_offers
  DROP CONSTRAINT IF EXISTS campaign_offers_escrow_status_check;

ALTER TABLE public.campaign_offers
  ADD CONSTRAINT campaign_offers_escrow_status_check
  CHECK (escrow_status IN ('holding', 'releasing', 'released'));

CREATE INDEX IF NOT EXISTS idx_campaign_offers_billing_request_id
  ON public.campaign_offers(billing_request_id);

CREATE INDEX IF NOT EXISTS idx_campaign_offers_escrow_status
  ON public.campaign_offers(escrow_status);

CREATE TABLE IF NOT EXISTS public.campaign_offer_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.campaign_offers(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('agency', 'creator')),
  recipient_id uuid NOT NULL,
  stripe_connect_account_id text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'failed', 'reversed')),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cot_unique_recipient
  ON public.campaign_offer_transfers(offer_id, recipient_type, recipient_id);

CREATE INDEX IF NOT EXISTS idx_cot_offer_id
  ON public.campaign_offer_transfers(offer_id);

CREATE INDEX IF NOT EXISTS idx_cot_stripe_transfer_id
  ON public.campaign_offer_transfers(stripe_transfer_id);

ALTER TABLE public.campaign_offer_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view campaign offer transfers" ON public.campaign_offer_transfers;
CREATE POLICY "Agencies can view campaign offer transfers"
  ON public.campaign_offer_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_offers co
      WHERE co.id = offer_id
        AND co.target_type = 'agency'
        AND co.target_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can view campaign offer transfers" ON public.campaign_offer_transfers;
CREATE POLICY "Creators can view campaign offer transfers"
  ON public.campaign_offer_transfers FOR SELECT
  USING (
    recipient_type = 'creator'
    AND recipient_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.record_campaign_offer_transfer(
  p_offer_id uuid,
  p_recipient_type text,
  p_recipient_id uuid,
  p_stripe_connect_account_id text,
  p_amount_cents bigint,
  p_currency text,
  p_stripe_transfer_id text DEFAULT NULL,
  p_status text DEFAULT 'created',
  p_failure_reason text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.campaign_offer_transfers (
    offer_id,
    recipient_type,
    recipient_id,
    stripe_connect_account_id,
    amount_cents,
    currency,
    stripe_transfer_id,
    status,
    failure_reason,
    updated_at
  ) VALUES (
    p_offer_id,
    p_recipient_type,
    p_recipient_id,
    p_stripe_connect_account_id,
    p_amount_cents,
    COALESCE(NULLIF(p_currency, ''), 'USD'),
    p_stripe_transfer_id,
    COALESCE(NULLIF(p_status, ''), 'created'),
    p_failure_reason,
    now()
  )
  ON CONFLICT (offer_id, recipient_type, recipient_id)
  DO UPDATE SET
    stripe_connect_account_id = EXCLUDED.stripe_connect_account_id,
    amount_cents = EXCLUDED.amount_cents,
    currency = EXCLUDED.currency,
    stripe_transfer_id = COALESCE(EXCLUDED.stripe_transfer_id, public.campaign_offer_transfers.stripe_transfer_id),
    status = EXCLUDED.status,
    failure_reason = EXCLUDED.failure_reason,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.licensing_requests.context_type IS 'Distinguishes between traditional licensing deals and campaign offer billing stubs.';
COMMENT ON COLUMN public.campaign_offers.billing_request_id IS 'Reference to the licensing_request row acting as the financial stub for this offer.';

-- ---------------------------------------------------------------------------
-- Creator dashboard: ensure modern licensing_payouts are included in v_face_payouts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_face_payouts AS
-- 1. Legacy Royalty Ledger
SELECT
  rl.face_id,
  p.full_name AS face_name,
  date_trunc('month', rl.period_month)::date AS period_month,
  SUM(CASE WHEN rl.status = 'paid' THEN rl.amount_cents ELSE 0 END) AS paid_cents,
  SUM(CASE WHEN rl.status = 'pending' THEN rl.amount_cents ELSE 0 END) AS pending_cents,
  SUM(rl.amount_cents) AS total_cents,
  COUNT(*) AS event_count
FROM public.royalty_ledger rl
JOIN public.creators p ON p.id = rl.face_id
GROUP BY rl.face_id, p.full_name, date_trunc('month', rl.period_month)

UNION ALL

-- 2. Modern Licensing Payouts (JSONB Splits)
SELECT
  (split->>'creator_id')::uuid AS face_id,
  c.full_name AS face_name,
  date_trunc('month', lp.paid_at)::date AS period_month,
  SUM((split->>'amount_cents')::bigint) AS paid_cents,
  0 AS pending_cents, -- These are always 'paid' once in this table
  SUM((split->>'amount_cents')::bigint) AS total_cents,
  COUNT(*) AS event_count
FROM public.licensing_payouts lp
CROSS JOIN LATERAL jsonb_array_elements(lp.talent_splits) AS split
JOIN public.creators c ON c.id = (split->>'creator_id')::uuid
WHERE (split->>'creator_id') IS NOT NULL AND (split->>'creator_id') <> ''
GROUP BY (split->>'creator_id')::uuid, c.full_name, date_trunc('month', lp.paid_at);

GRANT SELECT ON public.v_face_payouts TO anon;

-- ---------------------------------------------------------------------------
-- Hardening: prevent direct client reads from the private bucket.
-- Files in likelee-private must be accessed via backend proxy endpoints (service role).
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET public = false
WHERE id = 'likelee-private';

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        coalesce(qual, '') ILIKE '%likelee-private%'
        OR coalesce(with_check, '') ILIKE '%likelee-private%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Payout requests: connected-account payouts must NOT decrement internal balances.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_creator_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op for internal balances: creator payouts are executed on the connected account balance.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op for internal balances: agency payouts are executed on the connected account balance.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Option 2 hardening: creator_id-native billing + agency-scoped commissions
-- (Squashed from:
--  - 2026-03-21_creator_id_billing_flows.sql
--  - 2026-03-21_agency_creator_commissions_and_creator_assignments.sql)
-- ---------------------------------------------------------------------------

-- licensing_requests: allow creator_id-based subjects (campaign stubs + modern flows)
ALTER TABLE public.licensing_requests
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL;

DO $$
DECLARE
  has_talent_ids boolean;
  has_talent_name boolean;
  has_context_type boolean;
  has_campaign_offer_id boolean;
  check_sql text;
  subject_sql text;
BEGIN
  -- Drop NOT NULL on talent_id (legacy licensing uses it; campaign stubs can use creator_id).
  BEGIN
    ALTER TABLE public.licensing_requests
      ALTER COLUMN talent_id DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      NULL;
  END;

  -- Best-effort backfill before we tighten constraints.
  UPDATE public.licensing_requests lr
  SET creator_id = au.creator_id
  FROM public.agency_users au
  WHERE lr.creator_id IS NULL
    AND lr.talent_id = au.id
    AND au.creator_id IS NOT NULL;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'licensing_requests'
      AND column_name = 'talent_ids'
  ) INTO has_talent_ids;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'licensing_requests'
      AND column_name = 'talent_name'
  ) INTO has_talent_name;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'licensing_requests'
      AND column_name = 'context_type'
  ) INTO has_context_type;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'licensing_requests'
      AND column_name = 'campaign_offer_id'
  ) INTO has_campaign_offer_id;

  IF has_context_type THEN
    UPDATE public.licensing_requests
    SET context_type = NULL
    WHERE context_type IS NOT NULL
      AND btrim(context_type) = '';

    UPDATE public.licensing_requests
    SET context_type = lower(btrim(context_type))
    WHERE context_type IS NOT NULL;
  END IF;

  IF has_context_type AND has_campaign_offer_id THEN
    UPDATE public.licensing_requests
    SET context_type = 'campaign'
    WHERE (context_type IS NULL OR btrim(context_type) = '')
      AND campaign_offer_id IS NOT NULL;

    UPDATE public.licensing_requests
    SET context_type = 'licensing'
    WHERE COALESCE(context_type, 'licensing') = 'campaign'
      AND campaign_offer_id IS NULL;
  END IF;

  -- Defensive cleanup: keep legacy licensing rows compatible with the subject CHECK.
  IF has_talent_name THEN
    IF has_context_type THEN
      IF has_talent_ids THEN
        UPDATE public.licensing_requests
        SET talent_name = '(legacy missing talent)'
        WHERE COALESCE(context_type, 'licensing') <> 'campaign'
          AND talent_id IS NULL
          AND creator_id IS NULL
          AND (talent_ids IS NULL OR cardinality(talent_ids) = 0)
          AND (talent_name IS NULL OR btrim(talent_name) = '');
      ELSE
        UPDATE public.licensing_requests
        SET talent_name = '(legacy missing talent)'
        WHERE COALESCE(context_type, 'licensing') <> 'campaign'
          AND talent_id IS NULL
          AND creator_id IS NULL
          AND (talent_name IS NULL OR btrim(talent_name) = '');
      END IF;
    ELSE
      IF has_talent_ids THEN
        UPDATE public.licensing_requests
        SET talent_name = '(legacy missing talent)'
        WHERE talent_id IS NULL
          AND creator_id IS NULL
          AND (talent_ids IS NULL OR cardinality(talent_ids) = 0)
          AND (talent_name IS NULL OR btrim(talent_name) = '');
      ELSE
        UPDATE public.licensing_requests
        SET talent_name = '(legacy missing talent)'
        WHERE talent_id IS NULL
          AND creator_id IS NULL
          AND (talent_name IS NULL OR btrim(talent_name) = '');
      END IF;
    END IF;
  ELSE
    IF has_context_type THEN
      IF has_talent_ids THEN
        DELETE FROM public.licensing_requests
        WHERE COALESCE(context_type, 'licensing') <> 'campaign'
          AND talent_id IS NULL
          AND creator_id IS NULL
          AND (talent_ids IS NULL OR cardinality(talent_ids) = 0);
      ELSE
        DELETE FROM public.licensing_requests
        WHERE COALESCE(context_type, 'licensing') <> 'campaign'
          AND talent_id IS NULL
          AND creator_id IS NULL;
      END IF;
    ELSE
      IF has_talent_ids THEN
        DELETE FROM public.licensing_requests
        WHERE talent_id IS NULL
          AND creator_id IS NULL
          AND (talent_ids IS NULL OR cardinality(talent_ids) = 0);
      ELSE
        DELETE FROM public.licensing_requests
        WHERE talent_id IS NULL
          AND creator_id IS NULL;
      END IF;
    END IF;
  END IF;

  subject_sql := 'talent_id IS NOT NULL OR creator_id IS NOT NULL';
  IF has_talent_ids THEN
    subject_sql := subject_sql || ' OR (talent_ids IS NOT NULL AND cardinality(talent_ids) > 0)';
  END IF;
  IF has_talent_name THEN
    subject_sql := subject_sql || ' OR (talent_name IS NOT NULL AND btrim(talent_name) <> '''')';
  END IF;

  IF has_context_type AND has_campaign_offer_id THEN
    check_sql := '( (COALESCE(context_type,''licensing'') = ''campaign'' AND campaign_offer_id IS NOT NULL) OR (COALESCE(context_type,''licensing'') <> ''campaign'' AND (' || subject_sql || ')) )';
  ELSE
    check_sql := '(' || subject_sql || ')';
  END IF;

  EXECUTE 'ALTER TABLE public.licensing_requests DROP CONSTRAINT IF EXISTS licensing_requests_subject_check';
  EXECUTE format(
    'ALTER TABLE public.licensing_requests ADD CONSTRAINT licensing_requests_subject_check CHECK (%s)',
    check_sql
  );
END $$;

CREATE INDEX IF NOT EXISTS idx_licensing_requests_creator_id
  ON public.licensing_requests(creator_id);

-- payments: allow creator_id without talent_id
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.payments
      ALTER COLUMN talent_id DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      NULL;
  END;

  UPDATE public.payments p
  SET creator_id = au.creator_id
  FROM public.agency_users au
  WHERE p.creator_id IS NULL
    AND p.talent_id = au.id
    AND au.creator_id IS NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_creator_id
  ON public.payments(creator_id);

-- Agency-scoped commission overrides by creator_id
CREATE TABLE IF NOT EXISTS public.agency_creator_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  commission_rate numeric(10, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agency_creator_commissions UNIQUE (agency_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_creator_commissions_agency_creator
  ON public.agency_creator_commissions (agency_id, creator_id);

ALTER TABLE public.agency_creator_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can view creator commissions"
  ON public.agency_creator_commissions FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can insert creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can insert creator commissions"
  ON public.agency_creator_commissions FOR INSERT
  WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can update creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can update creator commissions"
  ON public.agency_creator_commissions FOR UPDATE
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can delete creator commissions" ON public.agency_creator_commissions;
CREATE POLICY "Agencies can delete creator commissions"
  ON public.agency_creator_commissions FOR DELETE
  USING (agency_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.agency_creator_commission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'set' CHECK (action IN ('set', 'reset')),
  commission_rate numeric(10, 2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_creator_commission_history_agency_changed
  ON public.agency_creator_commission_history (agency_id, changed_at DESC);

ALTER TABLE public.agency_creator_commission_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view creator commission history" ON public.agency_creator_commission_history;
CREATE POLICY "Agencies can view creator commission history"
  ON public.agency_creator_commission_history FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can insert creator commission history" ON public.agency_creator_commission_history;
CREATE POLICY "Agencies can insert creator commission history"
  ON public.agency_creator_commission_history FOR INSERT
  WITH CHECK (agency_id = auth.uid());

-- Forward-compat: if the table existed before this migration, ensure it supports reset rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_creator_commission_history'
      AND column_name = 'commission_rate'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.agency_creator_commission_history
      ALTER COLUMN commission_rate DROP NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_creator_commission_history'
      AND column_name = 'action'
  ) THEN
    ALTER TABLE public.agency_creator_commission_history
      ADD COLUMN action text NOT NULL DEFAULT 'set';
  END IF;

  -- Re-apply the action check constraint defensively.
  ALTER TABLE public.agency_creator_commission_history
    DROP CONSTRAINT IF EXISTS agency_creator_commission_history_action_check;
  ALTER TABLE public.agency_creator_commission_history
    ADD CONSTRAINT agency_creator_commission_history_action_check
    CHECK (action IN ('set', 'reset'));
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'talent_commissions'
  ) THEN
    INSERT INTO public.agency_creator_commissions (agency_id, creator_id, commission_rate, updated_at)
    SELECT
      tc.agency_id,
      au.creator_id,
      tc.commission_rate,
      COALESCE(tc.updated_at, now())
    FROM public.talent_commissions tc
    JOIN public.agency_users au ON au.id = tc.talent_id
    WHERE au.creator_id IS NOT NULL
    ON CONFLICT (agency_id, creator_id) DO UPDATE
    SET
      commission_rate = EXCLUDED.commission_rate,
      updated_at = GREATEST(public.agency_creator_commissions.updated_at, EXCLUDED.updated_at);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'talent_commissions'
  ) THEN
    DROP TABLE public.talent_commissions;
  END IF;
END $$;

-- agency_talent_relationships: allow creator-only memberships (talent_id NULL) + tier label
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'agency_talent_relationships'
  ) THEN
    ALTER TABLE public.agency_talent_relationships
      ALTER COLUMN talent_id DROP NOT NULL;

    ALTER TABLE public.agency_talent_relationships
      ADD COLUMN IF NOT EXISTS performance_tier_name text NOT NULL DEFAULT 'Inactive';

    DROP INDEX IF EXISTS public.uq_agency_talent_relationships_agency_talent;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_talent_relationships_agency_talent
      ON public.agency_talent_relationships(agency_id, talent_id)
      WHERE talent_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_talent_relationships_agency_creator
      ON public.agency_talent_relationships(agency_id, creator_id)
      WHERE creator_id IS NOT NULL;

    ALTER TABLE public.agency_talent_relationships
      DROP CONSTRAINT IF EXISTS agency_talent_relationships_identity_check;
    ALTER TABLE public.agency_talent_relationships
      ADD CONSTRAINT agency_talent_relationships_identity_check
      CHECK (talent_id IS NOT NULL OR creator_id IS NOT NULL);
  END IF;
END $$;

-- offer_talent_assignments + offer_asset_requests: allow creator-only memberships (talent_id NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'offer_talent_assignments'
  ) THEN
    UPDATE public.offer_talent_assignments ota
    SET creator_id = au.creator_id
    FROM public.agency_users au
    WHERE ota.creator_id IS NULL
      AND ota.talent_id IS NOT NULL
      AND au.id = ota.talent_id
      AND au.creator_id IS NOT NULL;

    ALTER TABLE public.offer_talent_assignments
      ALTER COLUMN talent_id DROP NOT NULL;

    ALTER TABLE public.offer_talent_assignments
      DROP CONSTRAINT IF EXISTS offer_talent_assignments_creator_required;
    ALTER TABLE public.offer_talent_assignments
      ADD CONSTRAINT offer_talent_assignments_creator_required
      CHECK (creator_id IS NOT NULL);

    -- Defensive cleanup: older partial UNIQUE indexes allowed multiple historical rows.
    -- We now require one row per (offer_id, creator_id) and (offer_id, talent_id) to support backend upserts.
    --
    -- Strategy: keep the "best" row per key:
    -- 1) prefer status='assigned' if present
    -- 2) otherwise keep the most recently updated
    -- and delete any remaining duplicates.
    WITH ranked_creator AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY offer_id, creator_id
          ORDER BY (status = 'assigned') DESC, updated_at DESC, created_at DESC, id DESC
        ) AS rn
      FROM public.offer_talent_assignments
      WHERE creator_id IS NOT NULL
    )
    DELETE FROM public.offer_talent_assignments ota
    USING ranked_creator rc
    WHERE ota.id = rc.id
      AND rc.rn > 1;

    WITH ranked_talent AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY offer_id, talent_id
          ORDER BY (status = 'assigned') DESC, updated_at DESC, created_at DESC, id DESC
        ) AS rn
      FROM public.offer_talent_assignments
      WHERE talent_id IS NOT NULL
    )
    DELETE FROM public.offer_talent_assignments ota
    USING ranked_talent rt
    WHERE ota.id = rt.id
      AND rt.rn > 1;

    -- Backend upserts use ON CONFLICT (offer_id, creator_id). Ensure a matching UNIQUE index exists.
    DROP INDEX IF EXISTS public.uq_offer_talent_assignments_offer_creator;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_talent_assignments_offer_creator
      ON public.offer_talent_assignments(offer_id, creator_id);

    CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_talent_assignments_offer_talent
      ON public.offer_talent_assignments(offer_id, talent_id)
      WHERE talent_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'offer_asset_requests'
  ) THEN
    UPDATE public.offer_asset_requests oar
    SET creator_id = au.creator_id
    FROM public.agency_users au
    WHERE oar.creator_id IS NULL
      AND oar.talent_id IS NOT NULL
      AND au.id = oar.talent_id
      AND au.creator_id IS NOT NULL;

    ALTER TABLE public.offer_asset_requests
      ALTER COLUMN talent_id DROP NOT NULL;

    ALTER TABLE public.offer_asset_requests
      DROP CONSTRAINT IF EXISTS offer_asset_requests_creator_required;
    ALTER TABLE public.offer_asset_requests
      ADD CONSTRAINT offer_asset_requests_creator_required
      CHECK (creator_id IS NOT NULL);
  END IF;
END $$;

COMMIT;
