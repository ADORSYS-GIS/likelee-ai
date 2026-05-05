-- 2026-05-04_fix_performance_stats_licensing_earnings.sql
--
-- The licensing_earnings CTE in get_agency_performance_stats had two bugs:
--
-- 1. It queried lp.talent_id which is NULL for multi-talent payouts.
--    Multi-talent payouts store per-talent amounts in talent_splits JSONB array:
--    [{"talent_id": "...", "amount_cents": 12345}, ...]
--    These were completely missed.
--
-- 2. It summed lp.amount_cents which is the AGENCY commission amount
--    (p_agency_amount_cents passed to complete_payment_link_checkout).
--    The talent earnings are in lp.talent_earnings_cents (total) and
--    per-talent in talent_splits[].amount_cents.
--
-- Fix: unnest talent_splits JSON array to get per-talent earnings,
-- fall back to talent_id + talent_earnings_cents for single-talent payouts.

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
    -- IRL earnings from the payments table (booking-based)
    SELECT
        p.talent_id,
        SUM(COALESCE(p.talent_earnings_cents, 0))::BIGINT AS amount_cents
    FROM public.payments p
    WHERE p.agency_id = p_agency_id
      AND p.status IN ('successful', 'succeeded')
      AND COALESCE(p.paid_at, p.created_at) >= p_earnings_start_date::timestamptz
    GROUP BY p.talent_id
),
-- Multi-talent licensing payouts: unnest talent_splits JSON array
licensing_earnings_multi AS (
    SELECT
        (split_item->>'talent_id')::uuid AS talent_id,
        SUM(COALESCE((split_item->>'amount_cents')::bigint, 0))::BIGINT AS amount_cents
    FROM public.licensing_payouts lp,
         jsonb_array_elements(
             CASE
                 WHEN jsonb_typeof(lp.talent_splits) = 'array'
                      AND jsonb_array_length(lp.talent_splits) > 0
                 THEN lp.talent_splits
                 ELSE '[]'::jsonb
             END
         ) AS split_item
    WHERE lp.agency_id = p_agency_id
      AND COALESCE(lp.paid_at, lp.created_at) >= p_earnings_start_date::timestamptz
      AND (split_item->>'talent_id') IS NOT NULL
      AND (split_item->>'talent_id') <> ''
    GROUP BY (split_item->>'talent_id')::uuid
),
-- Single-talent licensing payouts: talent_id column is set, talent_splits is empty/null
licensing_earnings_single AS (
    SELECT
        lp.talent_id,
        SUM(COALESCE(lp.talent_earnings_cents, 0))::BIGINT AS amount_cents
    FROM public.licensing_payouts lp
    WHERE lp.agency_id = p_agency_id
      AND lp.talent_id IS NOT NULL
      AND (
          lp.talent_splits IS NULL
          OR jsonb_typeof(lp.talent_splits) <> 'array'
          OR jsonb_array_length(lp.talent_splits) = 0
      )
      AND COALESCE(lp.paid_at, lp.created_at) >= p_earnings_start_date::timestamptz
    GROUP BY lp.talent_id
),
earnings AS (
    SELECT talent_id, SUM(amount_cents)::BIGINT AS total_earnings
    FROM (
        SELECT * FROM payment_earnings
        UNION ALL
        SELECT * FROM licensing_earnings_multi
        UNION ALL
        SELECT * FROM licensing_earnings_single
    ) u
    WHERE talent_id IS NOT NULL
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
