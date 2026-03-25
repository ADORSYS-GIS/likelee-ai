BEGIN;

CREATE OR REPLACE FUNCTION public.brand_avg_turnaround_hours(
  p_brand_id uuid,
  p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
      )
    )::integer,
    0
  )
  FROM public.brand_campaigns
  WHERE brand_id = p_brand_id
    AND completed_at IS NOT NULL
    AND completed_at >= start_date::timestamptz
    AND start_date >= date_trunc('month', p_month)::date
    AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

CREATE OR REPLACE FUNCTION public.industry_avg_turnaround_hours(
  p_month date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (completed_at - start_date::timestamptz)) / 3600
      )
    )::integer,
    0
  )
  FROM public.brand_campaigns
  WHERE completed_at IS NOT NULL
    AND completed_at >= start_date::timestamptz
    AND start_date >= date_trunc('month', p_month)::date
    AND start_date < (date_trunc('month', p_month) + interval '1 month')::date;
$$;

COMMIT;
