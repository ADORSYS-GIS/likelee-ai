    -- 0012_agency_clients_metrics.sql
    BEGIN;

    ALTER TABLE public.agency_clients
    ADD COLUMN IF NOT EXISTS next_follow_up_date timestamptz,
    ADD COLUMN IF NOT EXISTS notes text;

    -- Index for follow-up date to support "Follow-ups Due" dashboard query
    CREATE INDEX IF NOT EXISTS idx_agency_clients_follow_up ON public.agency_clients(next_follow_up_date);

    COMMIT;
