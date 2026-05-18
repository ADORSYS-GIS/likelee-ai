BEGIN;
DELETE FROM public.studio_provider_costs 
WHERE provider IN ('higgsfield', 'kive');
COMMIT;
