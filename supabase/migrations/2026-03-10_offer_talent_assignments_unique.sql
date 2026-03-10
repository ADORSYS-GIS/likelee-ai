BEGIN;

-- Ensure we have a real UNIQUE constraint for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_offer_talent_assignments_offer_talent_all'
  ) THEN
    ALTER TABLE public.offer_talent_assignments
      ADD CONSTRAINT uq_offer_talent_assignments_offer_talent_all
      UNIQUE (offer_id, talent_id);
  END IF;
END $$;

COMMIT;
