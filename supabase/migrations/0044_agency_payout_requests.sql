BEGIN;

CREATE OR REPLACE FUNCTION public.handle_payout_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved') THEN
        UPDATE public.agency_balances
        SET available_cents = available_cents - NEW.amount_cents,
            updated_at = now()
        WHERE agency_id = NEW.agency_id;
    END IF;

    IF (TG_OP = 'UPDATE' AND NEW.status = 'failed' AND OLD.status IN ('approved', 'processing')) THEN
        UPDATE public.agency_balances
        SET available_cents = available_cents + NEW.amount_cents,
            updated_at = now()
        WHERE agency_id = NEW.agency_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.agency_payout_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'USD'::text,
  payout_method text NOT NULL DEFAULT 'standard'::text,
  status text NOT NULL DEFAULT 'pending'::text,
  stripe_transfer_id text NULL,
  stripe_payout_id text NULL,
  failure_reason text NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agency_payout_requests_pkey PRIMARY KEY (id),
  CONSTRAINT agency_payout_requests_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies (id) ON DELETE CASCADE,
  CONSTRAINT agency_payout_requests_amount_cents_check CHECK ((amount_cents > 0)),
  CONSTRAINT agency_payout_requests_payout_method_check CHECK ((payout_method = ANY (ARRAY['standard'::text, 'instant'::text]))),
  CONSTRAINT agency_payout_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text,'approved'::text,'processing'::text,'paid'::text,'failed'::text])))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_agency_id ON public.agency_payout_requests USING btree (agency_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_status ON public.agency_payout_requests USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_agency_payout_requests_requested_at ON public.agency_payout_requests USING btree (requested_at desc) TABLESPACE pg_default;

ALTER TABLE public.agency_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view their payout requests" ON public.agency_payout_requests;
CREATE POLICY "Agencies can view their payout requests" ON public.agency_payout_requests
    FOR SELECT USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can create payout requests" ON public.agency_payout_requests;
CREATE POLICY "Agencies can create payout requests" ON public.agency_payout_requests
    FOR INSERT WITH CHECK (agency_id = auth.uid());

DROP TRIGGER IF EXISTS tr_update_agency_balance_on_payout_request ON public.agency_payout_requests;
CREATE TRIGGER tr_update_agency_balance_on_payout_request
AFTER INSERT OR UPDATE ON public.agency_payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_payout_request_status_change();

COMMIT;
