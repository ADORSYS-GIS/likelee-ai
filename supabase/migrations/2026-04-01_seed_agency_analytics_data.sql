BEGIN;

CREATE OR REPLACE FUNCTION public.seed_agency_analytics_data(
  p_agency_id uuid,
  p_reset boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_seed_tag text := format('analytics_seed:%s', p_agency_id);
  v_seed_prefix text := format('[seed:%s]', substring(replace(p_agency_id::text, '-', '') from 1 for 8));
  v_agency_exists boolean := false;
  v_now timestamptz := now();
  v_today date := current_date;
  v_thirty_days_ago timestamptz := now() - interval '30 days';
  v_sixty_days_ago timestamptz := now() - interval '60 days';
  


  v_talent_names text[] := ARRAY[
    'Carla Rodriguez',
    'Clemence Dubois',
    'Julia Bennett',
    'Aaron Chen',
    'Elena Martinez',
    'Maya Thompson',
    'Sophie Laurent',
    'Olivia Johnson',
    'Isabella Smith',
    'Emma Williams'
  ];
  v_stage_names text[] := ARRAY[
    'Carla',
    'Clemence',
    'Julia',
    'Aaron',
    'Elena',
    'Maya',
    'Sophie',
    'Olivia',
    'Isabella',
    'Emma'
  ];
  v_follower_counts bigint[] := ARRAY[
    245000,
    198000,
    156000,
    89000,
    134000,
    112000,
    167000,
    203000,
    178000,
    145000
  ];
  v_engagement_rates numeric[] := ARRAY[
    5.8,
    5.2,
    4.9,
    4.1,
    5.1,
    4.7,
    5.3,
    5.6,
    5.0,
    4.8
  ];
  v_consent_statuses text[] := ARRAY[
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
    'complete',
    'missing'
  ];
  v_verified_flags boolean[] := ARRAY[
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    false
  ];
  v_monthly_rates bigint[] := ARRAY[
    900000,
    850000,
    820000,
    750000,
    780000,
    770000,
    810000,
    830000,
    800000,
    740000
  ];
  v_cities text[] := ARRAY[
    'New York',
    'Paris',
    'Los Angeles',
    'Miami',
    'Barcelona',
    'London',
    'Milan',
    'Toronto',
    'Sydney',
    'Berlin'
  ];
  v_regions text[] := ARRAY[
    'North America',
    'Europe',
    'North America',
    'North America',
    'Europe',
    'Europe',
    'Europe',
    'North America',
    'Other',
    'Europe'
  ];

  v_client_companies text[] := ARRAY[
    'Luxe Beauty Co',
    'Fashion Forward Inc',
    'Lifestyle Brands Group',
    'Elite Cosmetics',
    'Urban Fashion House',
    'Wellness Lifestyle Co',
    'Premium Beauty Labs',
    'Style & Co Fashion'
  ];
  v_client_contacts text[] := ARRAY[
    'Maya Brooks',
    'Ethan Reed',
    'Sofia Lane',
    'Noah Price',
    'Isabella Chen',
    'Marcus Johnson',
    'Olivia Davis',
    'James Wilson'
  ];
  v_client_industries text[] := ARRAY[
    'Beauty',
    'Fashion',
    'Lifestyle',
    'Beauty',
    'Fashion',
    'Lifestyle',
    'Beauty',
    'Fashion'
  ];

  v_booking_campaign_names text[] := ARRAY[
    'Social Media Beauty Campaign',
    'E-commerce Fashion Launch',
    'Social Media Lifestyle Series',
    'Traditional Beauty Editorial',
    'E-commerce Fashion Collection',
    'Social Media Beauty Influencer',
    'Lifestyle Brand Partnership',
    'Traditional Fashion Campaign',
    'E-commerce Lifestyle Push',
    'Social Media Fashion Creator',
    'Beauty Brand Ambassador',
    'Fashion Editorial Feature'
  ];
  v_booking_campaign_statuses text[] := ARRAY[
    'ongoing',
    'completed',
    'ongoing',
    'completed',
    'ongoing',
    'ongoing',
    'completed',
    'completed',
    'ongoing',
    'ongoing',
    'completed',
    'completed'
  ];
  v_booking_campaign_offsets integer[] := ARRAY[
    5,
    15,
    10,
    25,
    8,
    12,
    30,
    35,
    18,
    7,
    40,
    45
  ];
  v_booking_campaign_durations integer[] := ARRAY[
    30,
    20,
    25,
    15,
    28,
    35,
    18,
    12,
    22,
    40,
    16,
    14
  ];

  v_booking_offsets integer[] := ARRAY[
    3,
    5,
    8,
    10,
    12,
    15,
    18,
    20,
    22,
    25,
    27,
    29,
    32,
    35,
    38,
    42,
    45,
    48,
    55,
    60,
    65,
    70
  ];
  v_booking_statuses text[] := ARRAY[
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'completed',
    'confirmed',
    'completed',
    'completed',
    'pending',
    'completed',
    'confirmed',
    'completed',
    'completed',
    'confirmed',
    'completed',
    'completed',
    'completed',
    'completed'
  ];
  v_booking_types text[] := ARRAY[
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'option',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed',
    'confirmed'
  ];
  v_booking_rates integer[] := ARRAY[
    340000,
    340000,
    270000,
    270000,
    260000,
    260000,
    100000,
    95000,
    90000,
    85000,
    80000,
    75000,
    70000,
    65000,
    60000,
    55000,
    50000,
    45000,
    40000,
    35000,
    30000,
    25000
  ];
  v_booking_locations text[] := ARRAY[
    'New York',
    'Paris',
    'Los Angeles',
    'Miami',
    'New York',
    'Paris',
    'Los Angeles',
    'London',
    'Milan',
    'Barcelona',
    'Miami',
    'New York',
    'Los Angeles',
    'Paris',
    'London',
    'Berlin',
    'Toronto',
    'Milan',
    'Barcelona',
    'Dubai',
    'Sydney',
    'Tokyo'
  ];

  v_license_client_names text[] := ARRAY[
    'Luxe Beauty Co',
    'Fashion Forward Inc',
    'Elite Cosmetics',
    'Premium Lifestyle Brand',
    'Metro Fashion Group',
    'Glamour Beauty',
    'StyleHub International',
    'Urban Chic Brands',
    'Velvet Beauty',
    'Chic Lifestyle Co',
    'Prestige Fashion',
    'Beauty Essence',
    'Fashion Elite Group'
  ];
  v_license_regions text[] := ARRAY[
    'North America',
    'Europe',
    'North America',
    'Global',
    'Europe',
    'North America',
    'Europe',
    'North America',
    'Europe',
    'Other',
    'North America',
    'Europe',
    'Global'
  ];
  v_license_statuses text[] := ARRAY[
    'pending',
    'pending',
    'pending',
    'approved',
    'approved',
    'approved',
    'approved',
    'approved',
    'approved',
    'rejected',
    'approved',
    'approved',
    'approved'
  ];
  v_license_created_offsets integer[] := ARRAY[
    3,
    5,
    7,
    15,
    25,
    35,
    45,
    55,
    65,
    75,
    85,
    95,
    105
  ];
  v_license_deadline_offsets integer[] := ARRAY[
    14,
    18,
    22,
    90,
    85,
    80,
    75,
    70,
    65,
    -5,
    28,
    120,
    110
  ];
  v_license_amounts bigint[] := ARRAY[
    0,
    0,
    0,
    480000,
    520000,
    440000,
    460000,
    500000,
    490000,
    0,
    510000,
    530000,
    470000
  ];


  
  -- Package data
  v_package_titles text[] := ARRAY[
    'Spring 2026 Talent Showcase',
    'Premium AI Avatars Collection',
    'Exclusive Fashion Roster'
  ];
  v_package_descriptions text[] := ARRAY[
    'Our top talent picks for spring campaigns',
    'High-quality AI-generated avatars for digital campaigns',
    'Elite fashion models for luxury brands'
  ];

  v_seed_talent_ids uuid[] := ARRAY[]::uuid[];
  v_seed_creator_ids uuid[] := ARRAY[]::uuid[];
  v_seed_client_ids uuid[] := ARRAY[]::uuid[];
  v_seed_booking_campaign_ids uuid[] := ARRAY[]::uuid[];
  v_seed_campaign_ids uuid[] := ARRAY[]::uuid[];
  v_seed_booking_ids uuid[] := ARRAY[]::uuid[];
  v_seed_booking_id_texts text[] := ARRAY[]::text[];
  v_seed_request_ids uuid[] := ARRAY[]::uuid[];
  v_seed_package_ids uuid[] := ARRAY[]::uuid[];

  v_talent_id uuid;
  v_creator_id uuid;
  v_client_id uuid;
  v_booking_campaign_id uuid;
  v_campaign_id uuid;
  v_booking_id uuid;
  v_request_id uuid;
  v_package_id uuid;
  v_package_item_id uuid;
  v_payment_paid_at timestamptz;
  v_payment_status text;
  v_gross_cents bigint;
  v_talent_share_cents bigint;
  v_agency_share_cents bigint;
  v_booking_created_at timestamptz;
  v_booking_updated_at timestamptz;
  v_decided_at timestamptz;
  v_license_created_at timestamptz;
  v_license_deadline date;
  i integer;
  j integer;
  v_talent_idx integer;
  v_client_idx integer;
  v_booking_campaign_idx integer;
  v_campaign_type text;
  v_brand_vertical text;
BEGIN
  IF p_agency_id IS NULL THEN
    RAISE EXCEPTION 'p_agency_id is required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.agencies
    WHERE id = p_agency_id
  )
  INTO v_agency_exists;

  IF NOT v_agency_exists THEN
    RAISE EXCEPTION 'Agency % does not exist in public.agencies', p_agency_id;
  END IF;

  IF p_reset THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_booking_ids
    FROM public.bookings
    WHERE agency_user_id = p_agency_id
      AND notes = v_seed_tag;

    SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
    INTO v_seed_booking_id_texts
    FROM public.bookings
    WHERE agency_user_id = p_agency_id
      AND notes = v_seed_tag;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_request_ids
    FROM public.licensing_requests
    WHERE agency_id = p_agency_id
      AND notes = v_seed_tag;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_client_ids
    FROM public.agency_clients
    WHERE agency_id = p_agency_id
      AND terms = v_seed_tag;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_booking_campaign_ids
    FROM public.bookings_campaigns
    WHERE agency_id = p_agency_id
      AND name LIKE v_seed_prefix || '%';

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_campaign_ids
    FROM public.campaigns
    WHERE agency_id = p_agency_id
      AND notes = v_seed_tag;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_talent_ids
    FROM public.agency_users
    WHERE agency_id = p_agency_id
      AND bio_notes = v_seed_tag;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_creator_ids
    FROM public.creators
    WHERE tagline = v_seed_tag;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_seed_package_ids
    FROM public.agency_talent_packages
    WHERE agency_id = p_agency_id
      AND title LIKE v_seed_prefix || '%';

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

    DELETE FROM public.licensing_payouts
    WHERE agency_id = p_agency_id
      AND licensing_request_id = ANY(v_seed_request_ids);

    DELETE FROM public.payments
    WHERE agency_id = p_agency_id
      AND (
        booking_id = ANY(v_seed_booking_id_texts)
        OR licensing_request_id = ANY(v_seed_request_ids)
        OR COALESCE(talent_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(v_seed_talent_ids)
        OR COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(v_seed_campaign_ids)
      );

    DELETE FROM public.licensing_requests
    WHERE id = ANY(v_seed_request_ids);

    DELETE FROM public.bookings
    WHERE id = ANY(v_seed_booking_ids);

    DELETE FROM public.bookings_campaigns
    WHERE id = ANY(v_seed_booking_campaign_ids);

    DELETE FROM public.campaigns
    WHERE id = ANY(v_seed_campaign_ids);

    DELETE FROM public.agency_talent_relationships
    WHERE agency_id = p_agency_id
      AND talent_id = ANY(v_seed_talent_ids);

    DELETE FROM public.creator_balances
    WHERE creator_id = ANY(v_seed_creator_ids);

    DELETE FROM public.agency_clients
    WHERE id = ANY(v_seed_client_ids);

    DELETE FROM public.agency_users
    WHERE id = ANY(v_seed_talent_ids);

    DELETE FROM public.creators
    WHERE id = ANY(v_seed_creator_ids);
  END IF;

  v_seed_talent_ids := ARRAY[]::uuid[];
  v_seed_creator_ids := ARRAY[]::uuid[];
  v_seed_client_ids := ARRAY[]::uuid[];
  v_seed_booking_campaign_ids := ARRAY[]::uuid[];
  v_seed_campaign_ids := ARRAY[]::uuid[];
  v_seed_booking_ids := ARRAY[]::uuid[];
  v_seed_booking_id_texts := ARRAY[]::text[];
  v_seed_request_ids := ARRAY[]::uuid[];
  v_seed_package_ids := ARRAY[]::uuid[];

  FOR i IN 1..array_length(v_client_companies, 1) LOOP
    INSERT INTO public.agency_clients (
      agency_id,
      company,
      contact_name,
      email,
      phone,
      terms,
      industry,
      next_follow_up_date,
      created_at,
      updated_at
    )
    VALUES (
      p_agency_id,
      format('%s %s', v_seed_prefix, v_client_companies[i]),
      v_client_contacts[i],
      format('seed.analytics+client.%s.%s@likelee.local', substring(replace(p_agency_id::text, '-', '') from 1 for 8), i),
      format('+1-555-010%s', i),
      v_seed_tag,
      v_client_industries[i],
      v_today + (i * 7),
      v_now - make_interval(days => 40 - (i * 3)),
      v_now - make_interval(days => 2)
    )
    RETURNING id INTO v_client_id;

    v_seed_client_ids := array_append(v_seed_client_ids, v_client_id);
  END LOOP;

  FOR i IN 1..array_length(v_talent_names, 1) LOOP
    INSERT INTO public.creators (
      full_name,
      email,
      city,
      state,
      tagline,
      kyc_status,
      verified_at,
      created_at,
      updated_at
    )
    VALUES (
      v_talent_names[i],
      format('seed.analytics+creator.%s.%s@likelee.local', substring(replace(p_agency_id::text, '-', '') from 1 for 8), i),
      v_cities[i],
      v_regions[i],
      v_seed_tag,
      CASE WHEN v_verified_flags[i] THEN 'approved' ELSE 'pending' END,
      CASE WHEN v_verified_flags[i] THEN v_now - make_interval(days => 20 + i) ELSE NULL END,
      v_now - make_interval(days => 140 - (i * 6)),
      v_now - make_interval(days => 5)
    )
    RETURNING id INTO v_creator_id;

    v_seed_creator_ids := array_append(v_seed_creator_ids, v_creator_id);

    INSERT INTO public.agency_users (
      agency_id,
      creator_id,
      role,
      status,
      full_legal_name,
      stage_name,
      email,
      city,
      state_province,
      country,
      bio_notes,
      instagram_handle,
      instagram_followers,
      engagement_rate,
      consent_status,
      is_verified_talent,
      licensing_rate_monthly_cents,
      total_earnings_cents,
      active_licenses_count,
      earnings_30d,
      projected_earnings,
      created_at,
      updated_at
    )
    VALUES (
      p_agency_id,
      v_creator_id,
      'talent',
      'active',
      v_talent_names[i],
      v_stage_names[i],
      format('seed.analytics+talent.%s.%s@likelee.local', substring(replace(p_agency_id::text, '-', '') from 1 for 8), i),
      v_cities[i],
      v_regions[i],
      CASE WHEN v_regions[i] IN ('Europe', 'United Kingdom') THEN 'Europe' ELSE 'United States' END,
      v_seed_tag,
      lower(v_stage_names[i]),
      v_follower_counts[i],
      v_engagement_rates[i],
      v_consent_statuses[i],
      v_verified_flags[i],
      v_monthly_rates[i],
      0,
      0,
      0,
      0,
      v_now - make_interval(days => 135 - (i * 5)),
      v_now - make_interval(days => 3)
    )
    RETURNING id INTO v_talent_id;

    v_seed_talent_ids := array_append(v_seed_talent_ids, v_talent_id);

    INSERT INTO public.agency_talent_relationships (
      agency_id,
      talent_id,
      creator_id,
      status,
      licensing_rate_monthly_cents,
      accept_negotiations,
      rate_currency,
      created_at,
      updated_at
    )
    VALUES (
      p_agency_id,
      v_talent_id,
      v_creator_id,
      'active',
      v_monthly_rates[i],
      true,
      'USD',
      v_now - make_interval(days => 135 - (i * 5)),
      v_now - make_interval(days => 3)
    )
    ON CONFLICT (agency_id, talent_id) DO UPDATE
    SET
      creator_id = EXCLUDED.creator_id,
      status = EXCLUDED.status,
      licensing_rate_monthly_cents = EXCLUDED.licensing_rate_monthly_cents,
      accept_negotiations = EXCLUDED.accept_negotiations,
      rate_currency = EXCLUDED.rate_currency,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  FOR i IN 1..array_length(v_booking_campaign_names, 1) LOOP
    INSERT INTO public.bookings_campaigns (
      agency_id,
      name,
      status,
      duration_days,
      start_date,
      created_at,
      updated_at
    )
    VALUES (
      p_agency_id,
      format('%s %s', v_seed_prefix, v_booking_campaign_names[i]),
      v_booking_campaign_statuses[i],
      v_booking_campaign_durations[i],
      v_today - v_booking_campaign_offsets[i],
      v_now - make_interval(days => v_booking_campaign_offsets[i]),
      v_now - make_interval(days => greatest(v_booking_campaign_offsets[i] - 7, 1))
    )
    RETURNING id INTO v_booking_campaign_id;

    v_seed_booking_campaign_ids := array_append(v_seed_booking_campaign_ids, v_booking_campaign_id);

    v_talent_idx := ((i - 1) % array_length(v_seed_talent_ids, 1)) + 1;
    
    -- Use valid campaign types: Photoshoot, Event, Endorsement
    -- Distribute to match dashboard breakdown: 45% / 35% / 20%
    -- Endorsement = 45%, Photoshoot = 35%, Event = 20%
    v_campaign_type := CASE
      WHEN i % 20 <= 9 THEN 'Endorsement'  -- 45% (indices 1-9 of 20 = 45%)
      WHEN i % 20 <= 16 THEN 'Photoshoot'  -- 35% (indices 10-16 of 20 = 35%)
      ELSE 'Event'                          -- 20% (indices 17-20 of 20 = 20%)
    END;
    
    -- Extract brand vertical from campaign name
    v_brand_vertical := CASE
      WHEN v_booking_campaign_names[i] ILIKE '%Beauty%' THEN 'Beauty'
      WHEN v_booking_campaign_names[i] ILIKE '%Fashion%' THEN 'Fashion'
      WHEN v_booking_campaign_names[i] ILIKE '%Lifestyle%' THEN 'Lifestyle'
      ELSE 'Fashion'
    END;
    
    INSERT INTO public.campaigns (
      agency_id,
      talent_id,
      name,
      campaign_type,
      brand_vertical,
      region,
      date,
      status,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      p_agency_id,
      v_seed_talent_ids[v_talent_idx],
      format('%s %s', v_seed_prefix, v_booking_campaign_names[i]),
      v_campaign_type,
      v_brand_vertical,
      v_regions[v_talent_idx],
      v_today - v_booking_campaign_offsets[i],
      CASE
        WHEN v_booking_campaign_statuses[i] = 'completed' THEN 'Completed'
        WHEN v_booking_campaign_statuses[i] = 'ongoing' THEN 'Confirmed'
        ELSE 'Pending'
      END,
      v_seed_tag,
      v_now - make_interval(days => v_booking_campaign_offsets[i]),
      v_now - make_interval(days => greatest(v_booking_campaign_offsets[i] - 6, 1))
    )
    RETURNING id INTO v_campaign_id;

    v_seed_campaign_ids := array_append(v_seed_campaign_ids, v_campaign_id);
  END LOOP;

  FOR i IN 1..array_length(v_booking_offsets, 1) LOOP
    v_talent_idx := ((i - 1) % array_length(v_seed_talent_ids, 1)) + 1;
    v_client_idx := ((i - 1) % array_length(v_seed_client_ids, 1)) + 1;
    v_booking_campaign_idx := ((i - 1) % array_length(v_seed_booking_campaign_ids, 1)) + 1;

    v_booking_created_at := v_now - make_interval(days => v_booking_offsets[i] + 4);
    v_booking_updated_at := CASE
      WHEN v_booking_statuses[i] = 'completed' THEN v_booking_created_at + interval '6 days'
      WHEN v_booking_statuses[i] = 'confirmed' THEN v_booking_created_at + interval '2 days'
      ELSE v_booking_created_at + interval '1 day'
    END;

    INSERT INTO public.bookings (
      agency_user_id,
      talent_id,
      talent_name,
      client_id,
      client_name,
      type,
      status,
      date,
      all_day,
      call_time,
      wrap_time,
      location,
      location_notes,
      rate_cents,
      currency,
      rate_type,
      notes,
      created_at,
      updated_at,
      campaign_id
    )
    VALUES (
      p_agency_id,
      v_seed_talent_ids[v_talent_idx],
      v_stage_names[v_talent_idx],
      v_seed_client_ids[v_client_idx],
      format('%s %s', v_seed_prefix, v_client_companies[v_client_idx]),
      v_booking_types[i]::public.booking_type,
      v_booking_statuses[i]::public.booking_status,
      v_today - v_booking_offsets[i],
      false,
      '09:00',
      '18:00',
      v_booking_locations[i],
      'Generated by seed_agency_analytics_data',
      v_booking_rates[i],
      'USD',
      'day'::public.booking_rate_type,
      v_seed_tag,
      v_booking_created_at,
      v_booking_updated_at,
      v_seed_booking_campaign_ids[v_booking_campaign_idx]
    )
    RETURNING id INTO v_booking_id;

    v_seed_booking_ids := array_append(v_seed_booking_ids, v_booking_id);
    v_seed_booking_id_texts := array_append(v_seed_booking_id_texts, v_booking_id::text);

    v_payment_status := CASE WHEN i IN (4, 9) THEN 'pending' ELSE 'succeeded' END;
    v_gross_cents := v_booking_rates[i] + (i * 5000);
    v_talent_share_cents := round(v_gross_cents::numeric * 0.75)::bigint;
    v_agency_share_cents := v_gross_cents - v_talent_share_cents;
    v_payment_paid_at := CASE
      WHEN v_payment_status = 'succeeded' THEN v_booking_updated_at + interval '2 days'
      ELSE NULL
    END;

    INSERT INTO public.payments (
      agency_id,
      talent_id,
      creator_id,
      campaign_id,
      booking_id,
      status,
      currency_code,
      gross_cents,
      talent_earnings_cents,
      agency_earnings_cents,
      commission_rate,
      paid_at,
      created_at
    )
    VALUES (
      p_agency_id,
      v_seed_talent_ids[v_talent_idx],
      v_seed_creator_ids[v_talent_idx],
      v_seed_campaign_ids[v_booking_campaign_idx],
      v_booking_id::text,
      v_payment_status,
      'USD',
      v_gross_cents,
      v_talent_share_cents,
      v_agency_share_cents,
      25.00,
      v_payment_paid_at,
      v_booking_created_at + interval '1 day'
    );
  END LOOP;

  FOR i IN 1..array_length(v_license_statuses, 1) LOOP
    v_talent_idx := ((i - 1) % array_length(v_seed_talent_ids, 1)) + 1;
    v_license_created_at := v_now - make_interval(days => v_license_created_offsets[i]);
    v_license_deadline := v_today + v_license_deadline_offsets[i];
    v_decided_at := CASE
      WHEN v_license_statuses[i] IN ('approved', 'rejected') THEN v_license_created_at + interval '2 days'
      ELSE NULL
    END;

    INSERT INTO public.licensing_requests (
      agency_id,
      talent_id,
      status,
      notes,
      decided_at,
      created_at,
      client_name,
      talent_name,
      license_start_date,
      license_end_date,
      deadline,
      context_type,
      talent_ids,
      base_rate_monthly_cents,
      offered_rate_monthly_cents,
      rate_currency,
      rate_source_type,
      rate_source_id,
      regions
    )
    VALUES (
      p_agency_id,
      v_seed_talent_ids[v_talent_idx],
      v_license_statuses[i],
      v_seed_tag,
      v_decided_at,
      v_license_created_at,
      format('%s %s', v_seed_prefix, v_license_client_names[i]),
      v_stage_names[v_talent_idx],
      v_today - greatest(v_license_created_offsets[i] - 2, 1),
      v_license_deadline,
      v_license_deadline,
      'licensing',
      ARRAY[v_seed_talent_ids[v_talent_idx]],
      v_monthly_rates[v_talent_idx],
      v_monthly_rates[v_talent_idx] + 50000,
      'USD',
      'agency_talent',
      v_seed_talent_ids[v_talent_idx]::text,
      v_license_regions[i]
    )
    RETURNING id INTO v_request_id;

    v_seed_request_ids := array_append(v_seed_request_ids, v_request_id);

    IF v_license_statuses[i] = 'approved' AND v_license_amounts[i] > 0 THEN
      INSERT INTO public.licensing_payouts (
        licensing_request_id,
        agency_id,
        talent_id,
        amount_cents,
        currency,
        paid_at,
        talent_earnings_cents,
        talent_splits,
        commission_rate,
        platform_fee_cents,
        net_amount_cents,
        created_at
      )
      VALUES (
        v_request_id,
        p_agency_id,
        v_seed_talent_ids[v_talent_idx],
        v_license_amounts[i],
        'USD',
        v_license_created_at + interval '7 days',
        0,
        jsonb_build_array(
          jsonb_build_object(
            'talent_id', v_seed_talent_ids[v_talent_idx]::text,
            'creator_id', v_seed_creator_ids[v_talent_idx]::text,
            'amount_cents', v_license_amounts[i]
          )
        ),
        20.00,
        0,
        v_license_amounts[i],
        v_license_created_at + interval '7 days'
      );
    END IF;
  END LOOP;

  -- Note: Job postings require a brand user in auth.users table, which cannot be easily
  -- created in a seed function. Skipping job postings creation for this seed data.

  -- Seed Talent Packages
  FOR i IN 1..array_length(v_package_titles, 1) LOOP
    INSERT INTO public.agency_talent_packages (
      agency_id,
      title,
      description,
      primary_color,
      secondary_color,
      custom_message,
      client_name,
      client_email,
      allow_comments,
      allow_favorites,
      allow_callbacks,
      created_at,
      updated_at
    )
    VALUES (
      p_agency_id,
      format('%s %s', v_seed_prefix, v_package_titles[i]),
      v_package_descriptions[i],
      '#2563eb',
      '#f59e0b',
      'Thank you for reviewing our talent package. We look forward to working with you!',
      v_client_contacts[((i - 1) % array_length(v_client_contacts, 1)) + 1],
      format('seed.analytics+package.client.%s.%s@likelee.local', substring(replace(p_agency_id::text, '-', '') from 1 for 8), i),
      true,
      true,
      true,
      v_now - make_interval(days => 20 + (i * 8)),
      v_now - make_interval(days => 5 + i)
    )
    RETURNING id INTO v_package_id;

    v_seed_package_ids := array_append(v_seed_package_ids, v_package_id);

    -- Add package stats
    INSERT INTO public.agency_talent_package_stats (
      package_id,
      view_count,
      last_viewed_at,
      unique_visitors
    )
    VALUES (
      v_package_id,
      15 + (i * 7),
      v_now - interval '2 days',
      8 + (i * 3)
    );

    -- Add 3-4 talents to each package
    FOR j IN 1..LEAST(4, array_length(v_seed_talent_ids, 1)) LOOP
      v_talent_idx := ((i + j - 2) % array_length(v_seed_talent_ids, 1)) + 1;
      
      INSERT INTO public.agency_talent_package_items (
        package_id,
        talent_id,
        sort_order,
        created_at
      )
      VALUES (
        v_package_id,
        v_seed_talent_ids[v_talent_idx],
        j,
        v_now - make_interval(days => 18 + (i * 7))
      )
      RETURNING id INTO v_package_item_id;

      -- Add a couple of interactions (favorites and comments)
      IF j <= 2 THEN
        INSERT INTO public.agency_talent_package_interactions (
          package_id,
          talent_id,
          type,
          content,
          client_name,
          client_email,
          created_at
        )
        VALUES (
          v_package_id,
          v_seed_talent_ids[v_talent_idx],
          CASE WHEN j = 1 THEN 'favorite' ELSE 'comment' END,
          CASE WHEN j = 1 THEN NULL ELSE 'Great portfolio! Very interested in this talent.' END,
          v_client_contacts[((i - 1) % array_length(v_client_contacts, 1)) + 1],
          format('seed.analytics+package.client.%s.%s@likelee.local', substring(replace(p_agency_id::text, '-', '') from 1 for 8), i),
          v_now - make_interval(days => 10 + (i * 3) - j)
        );
      END IF;
    END LOOP;

    -- Add a general comment on the package
    INSERT INTO public.agency_talent_package_interactions (
      package_id,
      talent_id,
      type,
      content,
      client_name,
      client_email,
      created_at
    )
    VALUES (
      v_package_id,
      NULL,
      'comment',
      'Excellent selection of talent. We are reviewing and will get back to you soon.',
      v_client_contacts[((i - 1) % array_length(v_client_contacts, 1)) + 1],
      format('seed.analytics+package.client.%s.%s@likelee.local', substring(replace(p_agency_id::text, '-', '') from 1 for 8), i),
      v_now - make_interval(days => 8 + (i * 2))
    );
  END LOOP;

  WITH irl AS (
    SELECT
      talent_id,
      SUM(talent_earnings_cents)::bigint AS total_irl,
      SUM(
        CASE
          WHEN paid_at IS NOT NULL AND paid_at >= v_thirty_days_ago THEN talent_earnings_cents
          ELSE 0
        END
      )::bigint AS last_30_irl,
      SUM(
        CASE
          WHEN paid_at IS NOT NULL AND paid_at >= v_sixty_days_ago THEN talent_earnings_cents
          ELSE 0
        END
      )::bigint AS last_60_irl
    FROM public.payments
    WHERE agency_id = p_agency_id
      AND status = 'succeeded'
      AND talent_id IS NOT NULL
    GROUP BY talent_id
  ),
  ai AS (
    SELECT
      (split->>'talent_id')::uuid AS talent_id,
      SUM((split->>'amount_cents')::bigint)::bigint AS total_ai,
      SUM(
        CASE
          WHEN lp.paid_at >= v_thirty_days_ago THEN (split->>'amount_cents')::bigint
          ELSE 0
        END
      )::bigint AS last_30_ai,
      SUM(
        CASE
          WHEN lp.paid_at >= v_sixty_days_ago THEN (split->>'amount_cents')::bigint
          ELSE 0
        END
      )::bigint AS last_60_ai
    FROM public.licensing_payouts lp
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(lp.talent_splits, '[]'::jsonb)) AS split
    WHERE lp.agency_id = p_agency_id
      AND (split->>'talent_id') IS NOT NULL
    GROUP BY (split->>'talent_id')::uuid
  ),
  active_licenses AS (
    SELECT
      talent_id,
      COUNT(*)::integer AS active_licenses_count
    FROM public.licensing_requests
    WHERE agency_id = p_agency_id
      AND status = 'approved'
      AND talent_id IS NOT NULL
      AND COALESCE(license_end_date, deadline) >= v_today
    GROUP BY talent_id
  ),
  merged AS (
    SELECT
      au.id AS talent_id,
      COALESCE(irl.total_irl, 0) + COALESCE(ai.total_ai, 0) AS total_all_time,
      COALESCE(irl.last_30_irl, 0) + COALESCE(ai.last_30_ai, 0) AS total_30d,
      COALESCE(irl.last_60_irl, 0) + COALESCE(ai.last_60_ai, 0) AS total_60d,
      COALESCE(active_licenses.active_licenses_count, 0) AS active_licenses_count
    FROM public.agency_users au
    LEFT JOIN irl
      ON irl.talent_id = au.id
    LEFT JOIN ai
      ON ai.talent_id = au.id
    LEFT JOIN active_licenses
      ON active_licenses.talent_id = au.id
    WHERE au.agency_id = p_agency_id
      AND au.bio_notes = v_seed_tag
  )
  UPDATE public.agency_users au
  SET
    total_earnings_cents = merged.total_all_time,
    earnings_30d = merged.total_30d,
    projected_earnings = merged.total_60d / 2,
    active_licenses_count = merged.active_licenses_count,
    updated_at = v_now
  FROM merged
  WHERE au.id = merged.talent_id;

  RETURN jsonb_build_object(
    'agency_id', p_agency_id,
    'seed_tag', v_seed_tag,
    'reset_applied', p_reset,
    'talents_created', COALESCE(array_length(v_seed_talent_ids, 1), 0),
    'clients_created', COALESCE(array_length(v_seed_client_ids, 1), 0),
    'booking_campaigns_created', COALESCE(array_length(v_seed_booking_campaign_ids, 1), 0),
    'campaign_rows_created', COALESCE(array_length(v_seed_campaign_ids, 1), 0),
    'bookings_created', COALESCE(array_length(v_seed_booking_ids, 1), 0),
    'licensing_requests_created', COALESCE(array_length(v_seed_request_ids, 1), 0),
    'talent_packages_created', COALESCE(array_length(v_seed_package_ids, 1), 0),
    'payments_created', 22,
    'licensing_payouts_created', 10,
    'invocation', format(
      'select public.seed_agency_analytics_data(''%s''::uuid, true);',
      p_agency_id
    )
  );
END;
$$;

COMMENT ON FUNCTION public.seed_agency_analytics_data(uuid, boolean) IS
  'Seeds repeatable IRL and AI agency analytics demo data including talent, bookings, licensing, job postings, job applications, and talent packages for comprehensive analytics dashboard testing.';

GRANT EXECUTE ON FUNCTION public.seed_agency_analytics_data(uuid, boolean) TO service_role;

COMMIT;
