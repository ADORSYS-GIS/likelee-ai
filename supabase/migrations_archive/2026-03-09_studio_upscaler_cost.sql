-- Remove higgsfield and kive provider costs (providers removed from codebase)
DELETE FROM studio_provider_costs 
WHERE provider IN ('higgsfield', 'kive');

-- Update provider constraint to only allow 'fal'
ALTER TABLE studio_provider_costs 
DROP CONSTRAINT IF EXISTS studio_provider_costs_provider_check;

ALTER TABLE studio_provider_costs 
ADD CONSTRAINT studio_provider_costs_provider_check 
CHECK (provider = 'fal');

-- Update generation_type constraint for studio_generations to allow 'video_upscale'
ALTER TABLE studio_generations
DROP CONSTRAINT IF EXISTS studio_generations_generation_type_check;

ALTER TABLE studio_generations
ADD CONSTRAINT studio_generations_generation_type_check
CHECK (generation_type IN ('video', 'image', 'avatar', 'image_to_video', 'video_upscale'));

-- Update generation_type constraint for studio_provider_costs to allow 'video_upscale'
ALTER TABLE studio_provider_costs
DROP CONSTRAINT IF EXISTS studio_provider_costs_generation_type_check;

ALTER TABLE studio_provider_costs
ADD CONSTRAINT studio_provider_costs_generation_type_check
CHECK (generation_type IN ('video', 'image', 'avatar', 'image_to_video', 'video_upscale'));

-- Add cost for 4K Video Upscaler
INSERT INTO studio_provider_costs (provider, model, generation_type, cost_per_generation, enabled)
VALUES ('fal', 'clarityai/crystal-video-upscaler', 'video_upscale', 15, true)
ON CONFLICT (provider, model, generation_type) DO UPDATE
SET cost_per_generation = 15, enabled = true;

-- Add resolution multipliers for premium models
-- Multipliers: 720p=1x, 1080p=2x, 2k/1k=4x, 4k=8x
UPDATE studio_provider_costs 
SET cost_modifiers = jsonb_build_object(
  'resolution_multipliers', jsonb_build_object(
    '720p', 1.0,
    '1080p', 2.0,
    '1440p', 4.0,
    '2k', 4.0,
    '2160p', 8.0,
    '4k', 8.0,
    'auto', 1.0
  )
)
WHERE provider = 'fal' 
AND model IN (
  'fal-ai/veo3.1',
  'fal-ai/veo3.1/image-to-video',
  'fal-ai/luma-dream-machine',
  'fal-ai/sora-2/image-to-video',
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
  'fal-ai/ltx-video'
);
