BEGIN;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS addon_irl_booking_enabled boolean NOT NULL DEFAULT false;

UPDATE public.agencies
SET addon_irl_booking_enabled = CASE
  WHEN stripe_subscription_id IS NOT NULL
    AND plan_tier IN ('basic', 'pro', 'enterprise') THEN true
  ELSE false
END
WHERE addon_irl_booking_enabled IS DISTINCT FROM CASE
  WHEN stripe_subscription_id IS NOT NULL
    AND plan_tier IN ('basic', 'pro', 'enterprise') THEN true
  ELSE false
END;

CREATE INDEX IF NOT EXISTS idx_agencies_addon_irl_booking_enabled
  ON public.agencies(addon_irl_booking_enabled);

COMMIT;
