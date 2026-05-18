BEGIN;

DROP INDEX IF EXISTS idx_licensing_payouts_agency_talent_status_paid_at;
CREATE INDEX IF NOT EXISTS idx_licensing_payouts_agency_talent_paid_at
  ON public.licensing_payouts (agency_id, talent_id, paid_at);

CREATE INDEX IF NOT EXISTS idx_payments_agency_talent_status_paid_at
  ON public.payments (agency_id, talent_id, status, paid_at);

CREATE INDEX IF NOT EXISTS idx_bookings_agency_talent_status_created
  ON public.bookings (agency_user_id, talent_id, status, created_at);

-- Replace stats RPC to use:
-- 1) IRL earnings from payments (status: successful/succeeded)
-- 2) AI earnings from licensing_payouts (all rows treated as approved, amount_cents)
-- 3) Ended bookings from bookings table
CREATE OR REPLACE FUNCTION public.get_agency_performance_stats(
    p_agency_id UUID,
    p_earnings_start_date DATE,
    p_bookings_start_date DATE
)
RETURNS TABLE (
    talent_id UUID,
    earnings_cents BIGINT,
    booking_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH
payment_earnings AS (
    SELECT
        p.talent_id,
        SUM(COALESCE(p.talent_earnings_cents, 0))::BIGINT AS amount_cents
    FROM public.payments p
    WHERE p.agency_id = p_agency_id
      AND p.status IN ('successful', 'succeeded')
      AND COALESCE(p.paid_at, p.created_at) >= p_earnings_start_date::timestamptz
    GROUP BY p.talent_id
),
licensing_earnings AS (
    SELECT
        lp.talent_id,
        SUM(COALESCE(lp.amount_cents, 0))::BIGINT AS amount_cents
    FROM public.licensing_payouts lp
    WHERE lp.agency_id = p_agency_id
      AND COALESCE(lp.paid_at, lp.created_at) >= p_earnings_start_date::timestamptz
    GROUP BY lp.talent_id
),
earnings AS (
    SELECT
        talent_id,
        SUM(amount_cents)::BIGINT AS total_earnings
    FROM (
        SELECT * FROM payment_earnings
        UNION ALL
        SELECT * FROM licensing_earnings
    ) u
    GROUP BY talent_id
),
bookings AS (
    SELECT
        b.talent_id,
        COUNT(*)::BIGINT AS total_bookings
    FROM public.bookings b
    WHERE b.agency_user_id = p_agency_id
      AND b.status IN ('confirmed', 'completed')
      AND b.created_at >= p_bookings_start_date::timestamptz
      AND (
        COALESCE(
          CASE
            -- duration-like strings stored in usage_duration (e.g. "90m", "2h", "3 hours")
            WHEN b.usage_duration ~* '^\s*\d+\s*(m|min|mins|minute|minutes)\s*$' THEN
              b.created_at + ((regexp_replace(lower(b.usage_duration), '[^0-9]', '', 'g') || ' minutes')::interval)
            WHEN b.usage_duration ~* '^\s*\d+\s*(h|hr|hrs|hour|hours)\s*$' THEN
              b.created_at + ((regexp_replace(lower(b.usage_duration), '[^0-9]', '', 'g') || ' hours')::interval)
            ELSE NULL
          END,
          -- fallback if duration is not parseable: use booking row timestamp
          b.created_at
        ) <= now()
      )
    GROUP BY b.talent_id
)
SELECT
    COALESCE(e.talent_id, b.talent_id) AS talent_id,
    COALESCE(e.total_earnings, 0) AS earnings_cents,
    COALESCE(b.total_bookings, 0) AS booking_count
FROM earnings e
FULL OUTER JOIN bookings b ON e.talent_id = b.talent_id
WHERE COALESCE(e.talent_id, b.talent_id) IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) TO authenticated, service_role;

COMMIT;
