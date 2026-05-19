BEGIN;
INSERT INTO public.studio_pricing_tiers (
    tier_name, tier_level, monthly_credits, max_generations_per_day,
    max_resolution, priority_processing, is_active
) VALUES
    ('free', 1, 50, 10, '1024x1024', false, true),
    ('basic', 2, 500, 100, '2048x2048', false, true),
    ('pro', 3, 2000, 500, '4096x4096', true, true),
    ('enterprise', 4, 10000, NULL, '8192x8192', true, true)
ON CONFLICT (tier_name) DO NOTHING;
COMMIT;
