BEGIN;
INSERT INTO public.brand_folders (brand_id, name, is_default)
SELECT b.id, 'Studio Generations', true
FROM public.brands b
WHERE NOT EXISTS (
  SELECT 1 FROM public.brand_folders bf 
  WHERE bf.brand_id = b.id AND bf.is_default = true
);
COMMIT;
