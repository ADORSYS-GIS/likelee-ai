BEGIN;

ALTER TABLE public.agencies
ADD COLUMN IF NOT EXISTS performance_commission_config jsonb DEFAULT '{
  "Premium": {"commission_rate": 0},
  "Core": {"commission_rate": 0},
  "Growth": {"commission_rate": 0},
  "Inactive": {"commission_rate": 0}
}'::jsonb;

UPDATE public.agencies
SET performance_commission_config = (
  '{
    "Premium": {"commission_rate": 0},
    "Core": {"commission_rate": 0},
    "Growth": {"commission_rate": 0},
    "Inactive": {"commission_rate": 0}
  }'::jsonb || COALESCE(performance_commission_config, '{}'::jsonb)
);

COMMIT;
