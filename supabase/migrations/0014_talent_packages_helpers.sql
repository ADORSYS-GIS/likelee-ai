-- 0014_talent_packages_helpers.sql
-- Consolidates stats and aggregate helper functions for Talent Packages

BEGIN;

-- 1. Function to increment package views (from 0015)
CREATE OR REPLACE FUNCTION public.increment_package_view(p_package_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.agency_talent_package_stats (package_id, view_count, last_viewed_at)
    VALUES (p_package_id, 1, now())
    ON CONFLICT (package_id)
    DO UPDATE SET 
        view_count = public.agency_talent_package_stats.view_count + 1,
        last_viewed_at = now();
END;
$$;

-- 2. Function to get aggregate stats for an agency (from 0015)
CREATE OR REPLACE FUNCTION public.get_agency_package_stats(p_agency_id uuid)
RETURNS TABLE (
    total_views bigint,
    total_favorites bigint,
    total_callbacks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(s.view_count), 0)::bigint as total_views,
        COALESCE(COUNT(i.id) FILTER (WHERE i.type = 'favorite'), 0)::bigint as total_favorites,
        COALESCE(COUNT(i.id) FILTER (WHERE i.type = 'callback'), 0)::bigint as total_callbacks
    FROM public.agency_talent_packages p
    LEFT JOIN public.agency_talent_package_stats s ON s.package_id = p.id
    LEFT JOIN public.agency_talent_package_interactions i ON i.package_id = p.id
    WHERE p.agency_id = p_agency_id AND p.is_template = false AND p.client_name IS NOT NULL;
END;
$$;

COMMIT;
