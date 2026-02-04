    -- Fix agency package stats aggregation to avoid view inflation

    BEGIN;

DROP FUNCTION IF EXISTS public.get_agency_package_stats(uuid);

    CREATE OR REPLACE FUNCTION public.get_agency_package_stats(p_agency_id uuid)
    RETURNS TABLE (
        total_views bigint
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            COALESCE(SUM(s.view_count), 0)::bigint as total_views
        FROM public.agency_talent_packages p
        LEFT JOIN public.agency_talent_package_stats s ON s.package_id = p.id
        WHERE p.agency_id = p_agency_id
        AND p.is_template = false
        AND p.client_name IS NOT NULL
        GROUP BY p.agency_id;
    END;
    $$;

    COMMIT;
