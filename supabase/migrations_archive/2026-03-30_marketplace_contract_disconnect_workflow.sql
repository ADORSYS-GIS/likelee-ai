BEGIN;

ALTER TABLE public.agency_creator_marketplace_contracts
  DROP CONSTRAINT IF EXISTS agency_creator_marketplace_contracts_status_check;

ALTER TABLE public.agency_creator_marketplace_contracts
  ADD COLUMN IF NOT EXISTS disconnect_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS disconnect_requested_by text,
  ADD COLUMN IF NOT EXISTS disconnect_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS disconnect_reason text,
  ADD COLUMN IF NOT EXISTS disconnect_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS disconnect_reviewed_at timestamptz;

UPDATE public.agency_creator_marketplace_contracts
SET disconnect_status = 'none'
WHERE disconnect_status IS NULL
   OR disconnect_status NOT IN ('none', 'pending', 'approved', 'rejected');

ALTER TABLE public.agency_creator_marketplace_contracts
  ADD CONSTRAINT agency_creator_marketplace_contracts_status_check
  CHECK (
    status IN (
      'draft',
      'pending_signature',
      'active',
      'expired',
      'declined',
      'voided',
      'terminated'
    )
  );

ALTER TABLE public.agency_creator_marketplace_contracts
  DROP CONSTRAINT IF EXISTS agency_creator_marketplace_contracts_disconnect_status_check;

ALTER TABLE public.agency_creator_marketplace_contracts
  ADD CONSTRAINT agency_creator_marketplace_contracts_disconnect_status_check
  CHECK (
    disconnect_status IN ('none', 'pending', 'approved', 'rejected')
  );

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_disconnect_status
  ON public.agency_creator_marketplace_contracts (agency_id, disconnect_status, updated_at DESC);

COMMIT;
