BEGIN;

CREATE TABLE IF NOT EXISTS public.agency_creator_marketplace_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES public.creator_agency_invites(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.license_templates(id) ON DELETE SET NULL,
  template_name text,
  contract_body text NOT NULL DEFAULT '',
  contract_body_format text NOT NULL DEFAULT 'markdown'
    CHECK (contract_body_format IN ('markdown', 'html')),
  rendered_contract_body text,
  commission_rate numeric(10, 2) NOT NULL
    CHECK (commission_rate >= 0 AND commission_rate <= 100),
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  placeholder_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_signature', 'active', 'expired', 'declined', 'voided')),
  docuseal_submission_id integer,
  docuseal_template_id integer,
  docuseal_status text NOT NULL DEFAULT 'draft',
  agency_submitter_id bigint,
  agency_submitter_slug text,
  agency_embed_src text,
  creator_submitter_id bigint,
  creator_submitter_slug text,
  signed_document_url text,
  sent_at timestamptz,
  signed_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_creator_marketplace_contracts_valid_window_check
    CHECK (valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_agency_creator
  ON public.agency_creator_marketplace_contracts (agency_id, creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_creator_status
  ON public.agency_creator_marketplace_contracts (creator_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_invite
  ON public.agency_creator_marketplace_contracts (invite_id);

CREATE INDEX IF NOT EXISTS idx_agency_creator_marketplace_contracts_docuseal_submission
  ON public.agency_creator_marketplace_contracts (docuseal_submission_id);

ALTER TABLE public.agency_creator_marketplace_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agencies can view marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Agencies can view marketplace creator contracts"
  ON public.agency_creator_marketplace_contracts
  FOR SELECT
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS "Agencies can manage marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Agencies can manage marketplace creator contracts"
  ON public.agency_creator_marketplace_contracts
  FOR ALL
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "Creators can view their marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Creators can view their marketplace creator contracts"
  ON public.agency_creator_marketplace_contracts
  FOR SELECT
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can update their marketplace creator contracts" ON public.agency_creator_marketplace_contracts;
CREATE POLICY "Creators can update their marketplace creator contracts"
  ON public.agency_creator_marketplace_contracts
  FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'creator_agency_invites'
  ) THEN
    ALTER TABLE public.creator_agency_invites
      ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.agency_creator_marketplace_contracts(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
