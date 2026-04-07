BEGIN;

-- Undo script for seed_agency_analytics_data_enhanced
-- This removes all seed data tracked in seed_sessions for a specific agency
-- Usage: Change the agency_id below to target a different agency

DO $$
DECLARE
  v_agency_id uuid := '324415d5-058b-49b6-b067-a34a14497912'::uuid;
  v_session record;
  v_seed_talent_ids uuid[];
  v_seed_creator_ids uuid[];
  v_seed_client_ids uuid[];
  v_seed_booking_campaign_ids uuid[];
  v_seed_campaign_ids uuid[];
  v_seed_booking_ids uuid[];
  v_seed_booking_id_texts text[];
  v_seed_request_ids uuid[];
  v_seed_package_ids uuid[];
BEGIN
  -- Process each seed session for this agency (in order of creation)
  FOR v_session IN 
    SELECT id, talent_ids, creator_ids, client_ids, booking_campaign_ids, 
           campaign_ids, booking_ids, request_ids, package_ids
    FROM public.seed_sessions
    WHERE agency_id = v_agency_id AND session_type = 'demo_analytics'
    ORDER BY created_at
  LOOP
    v_seed_talent_ids := COALESCE(v_session.talent_ids, ARRAY[]::uuid[]);
    v_seed_creator_ids := COALESCE(v_session.creator_ids, ARRAY[]::uuid[]);
    v_seed_client_ids := COALESCE(v_session.client_ids, ARRAY[]::uuid[]);
    v_seed_booking_campaign_ids := COALESCE(v_session.booking_campaign_ids, ARRAY[]::uuid[]);
    v_seed_campaign_ids := COALESCE(v_session.campaign_ids, ARRAY[]::uuid[]);
    v_seed_booking_ids := COALESCE(v_session.booking_ids, ARRAY[]::uuid[]);
    v_seed_request_ids := COALESCE(v_session.request_ids, ARRAY[]::uuid[]);
    v_seed_package_ids := COALESCE(v_session.package_ids, ARRAY[]::uuid[]);

    -- Convert booking_ids to text array for payments
    SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
    INTO v_seed_booking_id_texts
    FROM public.bookings
    WHERE id = ANY(v_seed_booking_ids);

    -- Delete in correct order (reverse of creation)
    
    -- 1. Delete package-related data
    IF array_length(v_seed_package_ids, 1) > 0 THEN
      DELETE FROM public.agency_talent_package_item_assets
      WHERE item_id IN (
        SELECT id FROM public.agency_talent_package_items
        WHERE package_id = ANY(v_seed_package_ids)
      );
      
      DELETE FROM public.agency_talent_package_items 
      WHERE package_id = ANY(v_seed_package_ids);
      
      DELETE FROM public.agency_talent_package_interactions 
      WHERE package_id = ANY(v_seed_package_ids);
      
      DELETE FROM public.agency_talent_package_stats 
      WHERE package_id = ANY(v_seed_package_ids);
      
      DELETE FROM public.agency_talent_packages 
      WHERE id = ANY(v_seed_package_ids);
      
      RAISE NOTICE 'Deleted % package records', array_length(v_seed_package_ids, 1);
    END IF;

    -- 2. Delete licensing data
    IF array_length(v_seed_request_ids, 1) > 0 THEN
      DELETE FROM public.licensing_payouts 
      WHERE agency_id = v_agency_id AND licensing_request_id = ANY(v_seed_request_ids);
      
      DELETE FROM public.licensing_requests 
      WHERE id = ANY(v_seed_request_ids);
      
      RAISE NOTICE 'Deleted % licensing request records', array_length(v_seed_request_ids, 1);
    END IF;

    -- 3. Delete payment and booking data
    IF array_length(v_seed_booking_ids, 1) > 0 THEN
      DELETE FROM public.payments 
      WHERE agency_id = v_agency_id AND (
        booking_id = ANY(v_seed_booking_id_texts)
        OR licensing_request_id = ANY(COALESCE(v_seed_request_ids, ARRAY[]::uuid[]))
        OR COALESCE(talent_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(COALESCE(v_seed_talent_ids, ARRAY[]::uuid[]))
        OR COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(COALESCE(v_seed_campaign_ids, ARRAY[]::uuid[]))
      );
      
      DELETE FROM public.bookings 
      WHERE id = ANY(v_seed_booking_ids);
      
      RAISE NOTICE 'Deleted % booking records', array_length(v_seed_booking_ids, 1);
    END IF;

    -- 4. Delete booking campaigns
    IF array_length(v_seed_booking_campaign_ids, 1) > 0 THEN
      DELETE FROM public.bookings_campaigns 
      WHERE id = ANY(v_seed_booking_campaign_ids);
      
      RAISE NOTICE 'Deleted % booking campaign records', array_length(v_seed_booking_campaign_ids, 1);
    END IF;

    -- 5. Delete campaigns
    IF array_length(v_seed_campaign_ids, 1) > 0 THEN
      DELETE FROM public.campaigns 
      WHERE id = ANY(v_seed_campaign_ids);
      
      RAISE NOTICE 'Deleted % campaign records', array_length(v_seed_campaign_ids, 1);
    END IF;

    -- 6. Delete agency talent relationships
    IF array_length(v_seed_talent_ids, 1) > 0 THEN
      DELETE FROM public.agency_talent_relationships 
      WHERE agency_id = v_agency_id AND talent_id = ANY(v_seed_talent_ids);
      
      RAISE NOTICE 'Deleted talent relationships for % talents', array_length(v_seed_talent_ids, 1);
    END IF;

    -- 7. Delete creator balances
    IF array_length(v_seed_creator_ids, 1) > 0 THEN
      DELETE FROM public.creator_balances 
      WHERE creator_id = ANY(v_seed_creator_ids);
    END IF;

    -- 8. Delete clients
    IF array_length(v_seed_client_ids, 1) > 0 THEN
      DELETE FROM public.agency_clients 
      WHERE id = ANY(v_seed_client_ids);
      
      RAISE NOTICE 'Deleted % client records', array_length(v_seed_client_ids, 1);
    END IF;

    -- 9. Delete agency_users (talent records)
    IF array_length(v_seed_talent_ids, 1) > 0 THEN
      DELETE FROM public.agency_users 
      WHERE id = ANY(v_seed_talent_ids);
      
      RAISE NOTICE 'Deleted % talent (agency_users) records', array_length(v_seed_talent_ids, 1);
    END IF;

    -- 10. Delete creators
    IF array_length(v_seed_creator_ids, 1) > 0 THEN
      DELETE FROM public.creators 
      WHERE id = ANY(v_seed_creator_ids);
      
      RAISE NOTICE 'Deleted % creator records', array_length(v_seed_creator_ids, 1);
    END IF;
  END LOOP;

  -- Finally, delete all seed_sessions for this agency
  DELETE FROM public.seed_sessions 
  WHERE agency_id = v_agency_id AND session_type = 'demo_analytics';

  RAISE NOTICE 'Completed undo for agency %', v_agency_id;
END $$;

COMMIT;
