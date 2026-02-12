BEGIN;

ALTER TABLE public.talent_portfolio_items
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS mime_type text;

CREATE INDEX IF NOT EXISTS idx_talent_portfolio_items_storage_path
  ON public.talent_portfolio_items (storage_path);

COMMIT;
