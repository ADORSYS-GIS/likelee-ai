-- 2026-05-04_fix_performance_stats_bookings_agency_filter.sql
--
-- The bookings CTE in get_agency_performance_stats used:
--   WHERE b.agency_user_id = p_agency_id
--
-- agency_user_id is the auth.users.id of the person who CREATED the booking,
-- not the agency's UUID. The agency_id column (added in
-- 2026-04-08_03_add_agency_id_to_bookings.sql) is the correct filter.
-- This caused booking_count to always return 0 for every talent.

BEGIN;

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
    WHERE b.agency_id = p_agency_id          -- fixed: was b.agency_user_id
      AND b.status IN ('confirmed', 'completed')
      AND b.created_at >= p_bookings_start_date::timestamptz
      AND (
        COALESCE(
          CASE
            WHEN b.usage_duration ~* '^\s*\d+\s*(m|min|mins|minute|minutes)\s*$' THEN
              b.created_at + ((regexp_replace(lower(b.usage_duration), '[^0-9]', '', 'g') || ' minutes')::interval)
            WHEN b.usage_duration ~* '^\s*\d+\s*(h|hr|hrs|hour|hours)\s*$' THEN
              b.created_at + ((regexp_replace(lower(b.usage_duration), '[^0-9]', '', 'g') || ' hours')::interval)
            ELSE NULL
          END,
          b.created_at
        ) <= now()
      )
    GROUP BY b.talent_id
)
SELECT
    COALESCE(e.talent_id, b.talent_id) AS talent_id,
    COALESCE(e.total_earnings, 0)      AS earnings_cents,
    COALESCE(b.total_bookings, 0)      AS booking_count
FROM earnings e
FULL OUTER JOIN bookings b ON e.talent_id = b.talent_id
WHERE COALESCE(e.talent_id, b.talent_id) IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) FROM public;
GRANT EXECUTE ON FUNCTION public.get_agency_performance_stats(UUID, DATE, DATE) TO authenticated, service_role;

COMMIT;
