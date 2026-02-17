BEGIN;

ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS performance_commission_config jsonb DEFAULT '{
  "Premium": {"commission_rate": 0},
  "Core": {"commission_rate": 0},
  "Growth": {"commission_rate": 0},
  "Inactive": {"commission_rate": 0}
}'::jsonb;

UPDATE public.agencies a
SET performance_commission_config = (
  COALESCE(a.performance_commission_config, '{}'::jsonb)
  || jsonb_strip_nulls(
    jsonb_build_object(
      'Premium', CASE
        WHEN (a.performance_config->'Premium'->>'commission_rate') IS NULL THEN NULL
        ELSE jsonb_build_object('commission_rate', (a.performance_config->'Premium'->>'commission_rate')::numeric)
      END,
      'Core', CASE
        WHEN (a.performance_config->'Core'->>'commission_rate') IS NULL THEN NULL
        ELSE jsonb_build_object('commission_rate', (a.performance_config->'Core'->>'commission_rate')::numeric)
      END,
      'Growth', CASE
        WHEN (a.performance_config->'Growth'->>'commission_rate') IS NULL THEN NULL
        ELSE jsonb_build_object('commission_rate', (a.performance_config->'Growth'->>'commission_rate')::numeric)
      END,
      'Inactive', CASE
        WHEN (a.performance_config->'Inactive'->>'commission_rate') IS NULL THEN NULL
        ELSE jsonb_build_object('commission_rate', (a.performance_config->'Inactive'->>'commission_rate')::numeric)
      END
    )
  )
)
WHERE a.performance_config IS NOT NULL;

COMMIT;
