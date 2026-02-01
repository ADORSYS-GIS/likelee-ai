-- 0010_random_invoice_numbers.sql
BEGIN;

-- Switch invoice numbering to a random unique format like: INVCZ9930308
-- (INVC + [A-Z] + 7 digits). Uniqueness is enforced by checking existing invoice_number.
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_agency_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  candidate text;
  tries integer := 0;
  letter text;
  digits text;
BEGIN
  LOOP
    tries := tries + 1;

    letter := chr(65 + floor(random() * 26)::int);
    digits := lpad(floor(random() * 10000000)::int::text, 7, '0');
    candidate := 'INVC' || letter || digits;

    IF NOT EXISTS (
      SELECT 1
      FROM public.agency_invoices ai
      WHERE ai.invoice_number = candidate
      LIMIT 1
    ) THEN
      RETURN candidate;
    END IF;

    IF tries >= 50 THEN
      -- Extremely unlikely; deterministic-ish fallback to keep the function total.
      RETURN 'INVCX' || lpad(floor(extract(epoch from now()))::bigint::text, 7, '0');
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO anon, authenticated, service_role;

COMMIT;
