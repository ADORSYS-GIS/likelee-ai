BEGIN;
INSERT INTO public.studio_provider_costs (provider, model, cost_per_image_cents, is_active)
VALUES 
    ('fal', 'flux-pro', 5, true),
    ('fal', 'flux-dev', 3, true),
    ('fal', 'flux-schnell', 1, true)
ON CONFLICT (provider, model) DO UPDATE SET
    cost_per_image_cents = EXCLUDED.cost_per_image_cents,
    is_active = EXCLUDED.is_active,
    updated_at = now();
COMMIT;
