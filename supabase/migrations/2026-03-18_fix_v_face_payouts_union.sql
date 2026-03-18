-- Migration: Fix v_face_payouts view to include modern licensing_payouts
-- The Creator UI (Royalty Wallet) relies on v_face_payouts, which previously only aggregated the legacy royalty_ledger table.
-- This migration updates the view to UNION ALL the legacy ledger with the modern licensing_payouts table (unpacking talent_splits).

BEGIN;

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

COMMIT;
