-- 018_fk_fixups.sql
-- Deferred FK constraints and views that reference tables created in later files

BEGIN;

-- ============================================================================
-- 1. DEFERRED FK CONSTRAINTS
-- ============================================================================

-- agency_files.relationship_id -> agency_talent_relationships (002 -> 007)
ALTER TABLE public.agency_files
    ADD CONSTRAINT fk_agency_files_relationship_id
    FOREIGN KEY (relationship_id) REFERENCES public.agency_talent_relationships(id) ON DELETE SET NULL;

-- agency_invoices.booking_id -> bookings (002 -> 009)
ALTER TABLE public.agency_invoices
    ADD CONSTRAINT fk_agency_invoices_booking_id
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

-- brand_license_requests.submission_id -> license_submissions (004 -> 006)
ALTER TABLE public.brand_license_requests
    ADD CONSTRAINT fk_brand_license_requests_submission_id
    FOREIGN KEY (submission_id) REFERENCES public.license_submissions(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. VIEWS
-- ============================================================================

-- Face payouts view (union of royalty_ledger and licensing_payouts)
CREATE OR REPLACE VIEW public.v_face_payouts AS
SELECT
    rl.face_id,
    p.full_name AS face_name,
    date_trunc('month', rl.period_month)::date AS period_month,
    SUM(CASE WHEN rl.status = 'paid' THEN rl.amount_cents ELSE 0 END)::bigint AS paid_cents,
    SUM(CASE WHEN rl.status = 'pending' THEN rl.amount_cents ELSE 0 END)::bigint AS pending_cents,
    SUM(rl.amount_cents)::bigint AS total_cents,
    COUNT(*) AS event_count
FROM public.royalty_ledger rl
JOIN public.creators p ON p.id = rl.face_id
GROUP BY rl.face_id, p.full_name, date_trunc('month', rl.period_month)

UNION ALL

SELECT
    (split->>'creator_id')::uuid AS face_id,
    c.full_name AS face_name,
    date_trunc('month', lp.paid_at)::date AS period_month,
    SUM((split->>'amount_cents')::bigint)::bigint AS paid_cents,
    0::bigint AS pending_cents,
    SUM((split->>'amount_cents')::bigint)::bigint AS total_cents,
    COUNT(*) AS event_count
FROM public.licensing_payouts lp
CROSS JOIN LATERAL jsonb_array_elements(lp.talent_splits) AS split
JOIN public.creators c ON c.id = (split->>'creator_id')::uuid
WHERE (split->>'creator_id') IS NOT NULL AND (split->>'creator_id') <> ''
GROUP BY (split->>'creator_id')::uuid, c.full_name, date_trunc('month', lp.paid_at);

GRANT SELECT ON public.v_face_payouts TO anon;

COMMIT;
