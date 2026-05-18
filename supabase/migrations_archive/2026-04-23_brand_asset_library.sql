BEGIN;

-- Phase 1: Add default folder support to brand_folders
ALTER TABLE public.brand_folders ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Phase 2: Add source_type tracking to brand_files
ALTER TABLE public.brand_files ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'upload'
  CHECK (source_type IN ('upload', 'studio_generation', 'external'));

-- Phase 3: Add generation_id to link studio generations to files
ALTER TABLE public.brand_files ADD COLUMN IF NOT EXISTS generation_id uuid REFERENCES public.studio_generations(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_brand_folders_is_default ON public.brand_folders(is_default);
CREATE INDEX IF NOT EXISTS idx_brand_files_source_type ON public.brand_files(source_type);
CREATE INDEX IF NOT EXISTS idx_brand_files_generation_id ON public.brand_files(generation_id);

-- Phase 4: Trigger for auto-creating default folder on brand creation
CREATE OR REPLACE FUNCTION create_brand_default_folder()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_folders (brand_id, name, is_default)
  VALUES (NEW.id, 'Studio Generations', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_brand_created ON brands;
CREATE TRIGGER on_brand_created
  AFTER INSERT ON brands
  FOR EACH ROW EXECUTE FUNCTION create_brand_default_folder();

-- Phase 5: Create storage analytics view
CREATE OR REPLACE VIEW brand_storage_analytics AS
SELECT 
  bf.brand_id,
  bf.source_type,
  bf.mime_type,
  COUNT(*) as file_count,
  SUM(bf.size_bytes) as total_bytes,
  AVG(bf.size_bytes) as avg_file_size
FROM brand_files bf
GROUP BY bf.brand_id, bf.source_type, bf.mime_type;

-- Phase 6: Backfill default folders for existing brands
INSERT INTO brand_folders (brand_id, name, is_default)
SELECT b.id, 'Studio Generations', true
FROM brands b
WHERE NOT EXISTS (
  SELECT 1 FROM brand_folders bf 
  WHERE bf.brand_id = b.id AND bf.is_default = true
);

COMMIT;
