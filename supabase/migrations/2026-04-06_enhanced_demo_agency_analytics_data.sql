BEGIN;

-- Enhanced seed function with realistic model photos and better analytics data
-- This replaces the basic seed with realistic demo data for client presentations
-- Uses seed_sessions table to track seed data IDs instead of visible tags

-- Create seed_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.seed_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'demo_analytics',
  created_at timestamptz NOT NULL DEFAULT now(),
  talent_ids uuid[] DEFAULT '{}',
  creator_ids uuid[] DEFAULT '{}',
  client_ids uuid[] DEFAULT '{}',
  booking_campaign_ids uuid[] DEFAULT '{}',
  campaign_ids uuid[] DEFAULT '{}',
  booking_ids uuid[] DEFAULT '{}',
  request_ids uuid[] DEFAULT '{}',
  package_ids uuid[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_seed_sessions_agency_id ON public.seed_sessions(agency_id);

CREATE OR REPLACE FUNCTION public.seed_agency_analytics_data_enhanced(
  p_agency_id uuid,
  p_reset boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id uuid;
  v_agency_exists boolean := false;
  v_now timestamptz := now();
  v_today date := current_date;
  v_thirty_days_ago timestamptz := now() - interval '30 days';
  v_sixty_days_ago timestamptz := now() - interval '60 days';

  -- Realistic talent data with diverse backgrounds
  v_talent_names text[] := ARRAY[
    'Chloe Bennett',
    'Valentina Russo',
    'Amara Okonkwo',
    'Harper Sinclair',
    'Yuki Tanaka',
    'Freya Johansen',
    'Camila Mendes',
    'Sienna Blake',
    'Zara Al-Rashid',
    'Aurora Virtanen'
  ];
  
  v_stage_names text[] := ARRAY[
    'Chloe',
    'Valentina',
    'Amara',
    'Harper',
    'Yuki',
    'Freya',
    'Camila',
    'Sienna',
    'Zara',
    'Aurora'
  ];

  -- Professional bios for each talent (for demo display)
  v_talent_bios text[] := ARRAY[
    'Runway model with 6 years experience walking for Prada, Gucci, and Versace. Born in Melbourne, now based in Milan. Known for striking editorial presence and versatility in haute couture and ready-to-wear collections.',
    'Italian beauty influencer and lifestyle content creator. Built a following of millions through authentic skincare routines and Mediterranean lifestyle content. Partnered with Dolce & Gabbana and Armani Beauty.',
    'Nigerian-British model breaking barriers in the industry. Featured in major campaigns celebrating African heritage and modern beauty. Advocate for representation and diversity in global fashion.',
    'New York-based commercial model specializing in e-commerce and catalog work. Has shot for major retailers including Nordstrom, Saks, and Neiman Marcus. Known for professional demeanor and quick turnaround.',
    'Japanese fashion model bridging Tokyo street style with international high fashion. Featured in Vogue Japan and collaborated with Comme des Garcons. Fluent in Japanese, English, and Korean.',
    'Scandinavian wellness model and holistic health advocate. Swedish-born with a focus on sustainable beauty and mindfulness. Has partnered with clean beauty brands across Europe and North America.',
    'Brazilian model with 4 years experience in swimwear and resort wear. Based in Rio de Janeiro with frequent shoots in Miami and Cancun. Known for natural beauty and beach lifestyle content.',
    'Australian fashion model and surfer. Combines athletic lifestyle with editorial work. Has shot for Roxy, Billabong, and various surf lifestyle brands. Passionate about ocean conservation.',
    'Qatar-born influencer specializing in modest fashion and luxury lifestyle. Bridges Eastern and Western fashion sensibilities. Has worked with major luxury houses adapting collections for Middle Eastern markets.',
    'Finnish high fashion model known for unique Nordic features. Rising star in avant-garde and conceptual fashion photography. Featured in experimental editorials and art house campaigns.'
  ];

  -- Instagram handles for realistic display
  v_instagram_handles text[] := ARRAY[
    'chloe.bennett.model',
    'valentina.russo.beauty',
    'amara.okonkwo.official',
    'harper.sinclair.nyc',
    'yuki.tanaka.fashion',
    'freya.johansen.wellness',
    'camila.mendes.rio',
    'sienna.blake.surf',
    'zara.alrashid.luxury',
    'aurora.virtanen.editorial'
  ];

  -- Creator taglines for profile display
  v_creator_taglines text[] := ARRAY[
    'Runway Model | Milan | Prada | Gucci | Versace',
    'Beauty Influencer | Italian Style | Skincare Expert',
    'Nigerian-British Model | Diversity Advocate | London',
    'Commercial Model | E-Commerce Specialist | NYC',
    'Japanese Fashion | Tokyo Street Style | International',
    'Wellness Model | Clean Beauty | Stockholm',
    'Brazilian Model | Swimwear | Resort Wear | Rio',
    'Surfer Model | Ocean Advocate | Australia',
    'Modest Fashion | Luxury Lifestyle | Doha',
    'Avant-Garde Model | Nordic Beauty | Helsinki'
  ];

  -- Professional model photos from Unsplash (royalty-free)
  -- These are real, high-quality portrait photos suitable for a modeling agency demo
  v_profile_photos text[] := ARRAY[
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1512310604669-443f26c35f52?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=800&h=1000&fit=crop'
  ];

  -- Gallery photos stored as simple text array (we'll build each gallery in the loop)
  v_gallery_photo_1 text[] := ARRAY[
    'https://images.unsplash.com/photo-1485893086164-526442a08e68?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1479936343636-73c69429adec?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1529535493050-757bcd8fd9bc?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=800&h=1000&fit=crop'
  ];

  v_gallery_photo_2 text[] := ARRAY[
    'https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=1000&fit=crop'
  ];

  v_gallery_photo_3 text[] := ARRAY[
    'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1502764613149-7f1d229e2307?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1464863979621-258859e62245?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1512310604669-443f26c35f52?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1485893086164-526442a08e68?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1479936343636-73c69429adec?w=800&h=1000&fit=crop'
  ];

  -- Realistic tier-based follower counts (industry standard distribution)
  v_follower_counts bigint[] := ARRAY[
    956000,   -- Chloe: Top tier runway model
    734000,   -- Valentina: Beauty influencer with strong following
    512000,   -- Amara: Diversity advocate, growing international
    289000,   -- Harper: Commercial model, steady following
    445000,   -- Yuki: International fashion presence
    267000,   -- Freya: Wellness niche, engaged community
    578000,   -- Camila: Swimwear, strong in Americas
    198000,   -- Sienna: Surf lifestyle, authentic following
    389000,   -- Zara: Luxury lifestyle, Middle East influence
    156000    -- Aurora: Avant-garde, artistic community
  ];

  -- Engagement rates (inversely correlated with follower count - realistic)
  v_engagement_rates numeric[] := ARRAY[
    3.8,  -- Chloe: larger audience, lower engagement rate
    5.2,  -- Valentina: beauty content, good engagement
    6.4,  -- Amara: advocacy content, very engaged audience
    4.9,  -- Harper: commercial audience, moderate engagement
    5.7,  -- Yuki: international audience, good engagement
    7.8,  -- Freya: wellness community, high engagement
    6.1,  -- Camila: lifestyle content, good engagement
    8.2,  -- Sienna: authentic surf community, highest engagement
    4.5,  -- Zara: luxury audience, moderate engagement
    9.1   -- Aurora: artistic niche, extremely engaged
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
    'complete'
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
    true
  ];

  -- More realistic monthly rates based on follower count and engagement (minimum $1,000/month)
  v_monthly_rates bigint[] := ARRAY[
    1850000,  -- $18,500/month for top runway talent
    1450000,
    1100000,
    850000,
    1200000,
    720000,
    1300000,
    550000,
    1500000,
    480000
  ];

  v_cities text[] := ARRAY[
    'Milan',
    'Rome',
    'London',
    'New York',
    'Tokyo',
    'Stockholm',
    'Rio de Janeiro',
    'Sydney',
    'Doha',
    'Helsinki'
  ];

  v_regions text[] := ARRAY[
    'Europe',
    'Europe',
    'Europe',
    'North America',
    'Other',
    'Europe',
    'Other',
    'Other',
    'Other',
    'Europe'
  ];

  -- Physical attributes for talent profiles
  v_gender_identities text[] := ARRAY[
    'Female',
    'Female',
    'Female',
    'Female',
    'Female',
    'Female',
    'Female',
    'Female',
    'Female',
    'Female'
  ];

  v_race_ethnicities text[][] := ARRAY[
    ARRAY['White', 'Australian'],
    ARRAY['White', 'Italian'],
    ARRAY['Black', 'British-Nigerian'],
    ARRAY['White', 'American'],
    ARRAY['Asian', 'Japanese'],
    ARRAY['White', 'Swedish'],
    ARRAY['Hispanic', 'Brazilian'],
    ARRAY['White', 'Australian'],
    ARRAY['Middle Eastern', 'Arab'],
    ARRAY['White', 'Finnish']
  ];

  v_hair_colors text[] := ARRAY[
    'Blonde',
    'Dark Brown',
    'Black',
    'Brunette',
    'Black',
    'Blonde',
    'Dark Brown',
    'Blonde',
    'Black',
    'Light Brown'
  ];

  v_eye_colors text[] := ARRAY[
    'Blue',
    'Brown',
    'Brown',
    'Green',
    'Dark Brown',
    'Blue',
    'Brown',
    'Blue',
    'Brown',
    'Blue'
  ];

  v_skin_tones text[] := ARRAY[
    'Fair',
    'Olive',
    'Dark',
    'Fair',
    'Fair',
    'Fair',
    'Light Brown',
    'Fair',
    'Medium',
    'Fair'
  ];

  v_height_feet integer[] := ARRAY[5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  v_height_inches integer[] := ARRAY[10, 8, 9, 7, 6, 11, 7, 8, 9, 10];

  v_bust_chest_inches integer[] := ARRAY[34, 36, 34, 33, 32, 34, 35, 34, 34, 33];
  v_waist_inches integer[] := ARRAY[24, 25, 25, 24, 23, 25, 26, 25, 25, 24];
  v_hips_inches integer[] := ARRAY[35, 37, 36, 35, 34, 36, 38, 36, 36, 35];

  v_special_skills text[][] := ARRAY[
    ARRAY['Runway', 'Editorial', 'High Fashion', 'Italian Language'],
    ARRAY['Beauty Content', 'Skincare', 'Italian Language', 'English Language'],
    ARRAY['Diversity Advocacy', 'Public Speaking', 'Editorial', 'Runway'],
    ARRAY['Commercial Modeling', 'E-Commerce', 'Catalog', 'Fitness Modeling'],
    ARRAY['Japanese Street Style', 'Editorial', 'Japanese Language', 'Korean Language'],
    ARRAY['Wellness', 'Yoga', 'Meditation', 'Clean Beauty'],
    ARRAY['Swimwear', 'Resort Wear', 'Portuguese Language', 'Beach Lifestyle'],
    ARRAY['Surfing', 'Ocean Conservation', 'Sports Modeling', 'Photography'],
    ARRAY['Modest Fashion', 'Arabic Language', 'Luxury Lifestyle', 'Styling'],
    ARRAY['Avant-Garde', 'Artistic Modeling', 'Editorial', 'Conceptual Fashion']
  ];

  v_phone_numbers text[] := ARRAY[
    '+39-02-5555-2001',
    '+39-06-5555-2002',
    '+44-20-5555-2003',
    '+1-212-555-2004',
    '+81-3-5555-2005',
    '+46-8-5555-2006',
    '+55-21-5555-2007',
    '+61-2-5555-2008',
    '+974-44-5555-2009',
    '+358-9-5555-2010'
  ];

  v_dates_of_birth text[] := ARRAY[
    '1996-04-12',
    '1995-08-28',
    '1994-02-15',
    '1997-11-03',
    '1998-06-20',
    '1993-09-08',
    '1996-12-14',
    '1995-05-22',
    '1994-10-30',
    '1997-01-18'
  ];

  v_hero_cameo_urls text[] := ARRAY[
    'https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502764613149-7f1d229e2307?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=1200&h=600&fit=crop'
  ];

  -- Voice sample URLs for talent profiles
  v_voice_sample_urls text[] := ARRAY[
    'https://storage.example.com/voice-samples/chloe-voice.mp3',
    'https://storage.example.com/voice-samples/valentina-voice.mp3',
    'https://storage.example.com/voice-samples/amara-voice.mp3',
    'https://storage.example.com/voice-samples/harper-voice.mp3',
    'https://storage.example.com/voice-samples/yuki-voice.mp3',
    'https://storage.example.com/voice-samples/freya-voice.mp3',
    'https://storage.example.com/voice-samples/camila-voice.mp3',
    'https://storage.example.com/voice-samples/sienna-voice.mp3',
    'https://storage.example.com/voice-samples/zara-voice.mp3',
    'https://storage.example.com/voice-samples/aurora-voice.mp3'
  ];

  -- Total assets count per talent
  v_total_assets integer[] := ARRAY[16, 22, 14, 12, 18, 11, 15, 9, 13, 7];

  -- Top brands each talent has worked with
  v_top_brands text[] := ARRAY[
    'Prada',
    'Dolce & Gabbana',
    'Vogue',
    'Nordstrom',
    'Comme des Garcons',
    'Aesop',
    'Victoria Secret',
    'Billabong',
    'Gucci',
    'I-D Magazine'
  ];

  -- Role types for talent classification
  v_role_types text[] := ARRAY[
    'Runway Model',
    'Beauty Influencer',
    'Editorial Model',
    'Commercial Model',
    'Fashion Model',
    'Wellness Model',
    'Swimwear Model',
    'Surf Lifestyle Model',
    'Luxury Lifestyle Influencer',
    'Avant-Garde Model'
  ];

  -- License expiry dates (future dates for active licenses)
  v_license_expiry_dates text[] := ARRAY[
    '2027-08-15',
    '2027-05-30',
    '2027-11-22',
    '2027-04-10',
    '2027-09-28',
    '2027-03-18',
    '2027-06-05',
    '2027-12-31',
    '2027-07-20',
    '2027-02-14'
  ];

  -- Tattoos and piercings information
  v_tattoos boolean[] := ARRAY[false, false, false, false, true, false, true, false, false, false];
  v_piercings boolean[] := ARRAY[true, true, true, true, true, true, true, true, true, true];

  -- Organizations and sports affiliations
  v_organizations text[] := ARRAY[
    'Italian Fashion Council',
    'Beauty Influencer Network',
    'Black Models Coalition',
    'Commercial Models Guild',
    'Japan Fashion Association',
    'Scandinavian Wellness Alliance',
    'Brazilian Fashion Union',
    'Surf Industry Association',
    'Middle East Fashion Council',
    'Nordic Models Agency'
  ];

  v_sports text[] := ARRAY[
    'Pilates',
    'Swimming',
    'Running',
    'Cycling',
    'Ballet',
    'Yoga',
    'Beach Volleyball',
    'Surfing',
    'Horse Riding',
    'Ice Skating'
  ];

  -- Performance tier names based on follower count and engagement
  v_performance_tier_names text[] := ARRAY[
    'Premium',
    'Premium',
    'Core',
    'Growth',
    'Core',
    'Growth',
    'Core',
    'Growth',
    'Core',
    'Growth'
  ];

  -- Ages calculated from dates of birth
  v_ages integer[] := ARRAY[30, 31, 32, 29, 28, 33, 30, 31, 32, 29];

  -- Hairstyle descriptions
  v_hairstyles text[] := ARRAY[
    'Long straight',
    'Medium wavy',
    'Short natural',
    'Long layered',
    'Long straight',
    'Medium bob',
    'Long beach waves',
    'Long straight',
    'Medium layered',
    'Short pixie'
  ];

  -- Height in cm (converted from feet/inches)
  v_height_cm integer[] := ARRAY[178, 173, 175, 170, 168, 180, 170, 173, 175, 178];

  -- Weight in kg (realistic for models)
  v_weight_kg integer[] := ARRAY[55, 58, 56, 54, 52, 57, 60, 56, 58, 53];

  -- Facial features for each talent
  v_facial_features text[][] := ARRAY[
    ARRAY['blue eyes', 'angular features', 'defined cheekbones'],
    ARRAY['warm expression', 'olive complexion', 'classic Italian features'],
    ARRAY['striking eyes', 'natural beauty', 'confident presence'],
    ARRAY['fresh faced', 'versatile look', 'professional demeanor'],
    ARRAY['almond eyes', 'delicate features', 'Japanese beauty'],
    ARRAY['nordic features', 'fair complexion', 'ethereal presence'],
    ARRAY['vibrant smile', 'exotic features', 'sunny disposition'],
    ARRAY['athletic features', 'sun-kissed look', 'natural charm'],
    ARRAY['sophisticated profile', 'elegant features', 'graceful presence'],
    ARRAY['unique Nordic features', 'striking look', 'artistic presence']
  ];

  -- TikTok handles for social presence
  v_tiktok_handles text[] := ARRAY[
    '@chloe.b.runway',
    '@valentina.russo',
    '@amara.okonkwo',
    '@harper.sinclair',
    '@yuki.tanaka.fashion',
    '@freya.johansen',
    '@camila.mendes.rio',
    '@sienna.blake.surf',
    '@zara.alrashid',
    '@aurora.virtanen'
  ];

  -- Portfolio links
  v_portfolio_links text[] := ARRAY[
    'https://chloebennett.model',
    'https://valentinarusso.beauty',
    'https://amaraokonkwo.model',
    'https://harpersinclair.commercial',
    'https://yukitanaka.fashion',
    'https://freyajohansen.wellness',
    'https://camilamendes.swimwear',
    'https://siennablake.surf',
    'https://zaraalrashid.luxury',
    'https://auroravirtanen.editorial'
  ];

  -- Liveness statuses
  v_liveness_statuses text[] := ARRAY[
    'not_started',
    'not_started',
    'not_started',
    'not_started',
    'not_started',
    'not_started',
    'not_started',
    'not_started',
    'not_started',
    'not_started'
  ];

  -- KYC providers
  v_kyc_providers text[] := ARRAY[
    'Jumio',
    'Onfido',
    'Stripe Identity',
    'Onfido',
    'Jumio',
    'Stripe Identity',
    'Onfido',
    'Jumio',
    'Onfido',
    'Stripe Identity'
  ];

  -- KYC session IDs (mock)
  v_kyc_session_ids text[] := ARRAY[
    'kyc_session_chloe_001',
    'kyc_session_valentina_002',
    'kyc_session_amara_003',
    'kyc_session_harper_004',
    'kyc_session_yuki_005',
    'kyc_session_freya_006',
    'kyc_session_camila_007',
    'kyc_session_sienna_008',
    'kyc_session_zara_009',
    'kyc_session_aurora_010'
  ];

  -- Cameo front URLs (hero images for public profile)
  v_cameo_front_urls text[] := ARRAY[
    'https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1502764613149-7f1d229e2307?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&h=1000&fit=crop'
  ];

  -- Client data with realistic company names and descriptions
  v_client_companies text[] := ARRAY[
    'Prada Group Marketing',
    'Dolce & Gabbana Beauty',
    'Vogue International',
    'Nordstrom Studios',
    'Comme des Garcons Media',
    'Aesop Skincare',
    'Victoria Secret Global',
    'Billabong International',
    'Gucci Beauty Division',
    'I-D Magazine Ventures'
  ];

  v_client_contacts text[] := ARRAY[
    'Marco Bianchi',
    'Lucia Romano',
    'Alexandra Petrova',
    'Jordan Mitchell',
    'Kenji Yamamoto',
    'Ingrid Svensson',
    'Carolina Santos',
    'Blake Thompson',
    'Fatima Al-Hassan',
    'Erik Lindqvist'
  ];

  v_client_emails text[] := ARRAY[
    'marco.bianchi@pradagroup.com',
    'lucia.romano@dgbauty.com',
    'alexandra.petrova@vogue.com',
    'jordan.mitchell@nordstrom.com',
    'kenji.yamamoto@cdgmedia.com',
    'ingrid.svensson@aesop.com',
    'carolina.santos@victoriassecret.com',
    'blake.thompson@billabong.com',
    'fatima.alhassan@guccibeauty.com',
    'erik.lindqvist@idmagazine.com'
  ];

  v_client_phones text[] := ARRAY[
    '+39-02-5555-3001',
    '+39-06-5555-3002',
    '+1-212-555-3003',
    '+1-206-555-3004',
    '+81-3-5555-3005',
    '+46-8-5555-3006',
    '+1-614-555-3007',
    '+61-2-5555-3008',
    '+971-4-5555-3009',
    '+44-20-5555-3010'
  ];

  v_client_industries text[] := ARRAY[
    'Luxury Fashion',
    'Beauty',
    'Media',
    'Retail',
    'Fashion',
    'Skincare',
    'Lingerie',
    'Surf Lifestyle',
    'Beauty',
    'Media'
  ];

  -- Client descriptions for relationship context
  v_client_descriptions text[] := ARRAY[
    'Italian luxury fashion house known for innovative runway shows and cutting-edge designs. Global presence with flagship stores in Milan, Paris, New York, and Tokyo.',
    'Beauty division of iconic Italian fashion house. Specializes in luxury fragrances and cosmetics with Mediterranean-inspired formulations.',
    'International fashion media company with publications across 20+ countries. Known for trend-setting editorials and cultural commentary.',
    'Nordic-inspired luxury retailer with focus on curated designer collections. Premium shopping experience with exclusive brand partnerships.',
    'Japanese fashion conglomerate known for avant-garde designs and experimental retail concepts. Pioneer in streetwear and deconstructed fashion.',
    'Australian skincare brand with philosophy rooted in botanical ingredients and minimalist aesthetics. Cult following among wellness enthusiasts.',
    'Global lingerie and lifestyle brand with focus on empowerment and inclusivity. Major presence in fashion events and influencer partnerships.',
    'Australian surf lifestyle brand with heritage in boardshorts and beach culture. Strong presence in coastal communities worldwide.',
    'Beauty division of Italian luxury house. Premium cosmetics and fragrances with emphasis on Italian craftsmanship and elegance.',
    'Independent media brand focused on youth culture and emerging talent. Known for boundary-pushing fashion photography and editorial content.'
  ];

  v_booking_campaign_names text[] := ARRAY[
    'Milan Fashion Week Spring 2026',
    'Mediterranean Beauty Essentials',
    'Diversity in Fashion Editorial',
    'Nordstrom Summer Catalog',
    'Tokyo Street Style Lookbook',
    'Scandinavian Wellness Journey',
    'Brazilian Beach Paradise Collection',
    'Australian Surf Lifestyle Series',
    'Middle East Luxury Ramadan',
    'Nordic Minimalist Beauty',
    'Prada Runway Exhibition',
    'Italian Glamour Campaign',
    'Empowerment Series London',
    'E-Commerce Spring Launch',
    'Harajuku Fashion Documentary',
    'Clean Beauty Scandinavia',
    'Rio Carnival Swimwear',
    'Surf Culture Documentary',
    'Modest Fashion Week Doha',
    'Avant-Garde Art Series'
  ];

  v_booking_campaign_statuses text[] := ARRAY[
    'completed', 'ongoing', 'completed', 'ongoing', 'completed',
    'ongoing', 'completed', 'ongoing', 'completed', 'completed',
    'ongoing', 'completed', 'ongoing', 'completed', 'ongoing',
    'completed', 'ongoing', 'completed', 'ongoing', 'completed'
  ];

  v_booking_campaign_offsets integer[] := ARRAY[
    5, 12, 18, 8, 25, 15, 22, 10, 30, 35,
    7, 40, 20, 28, 14, 45, 33, 50, 16, 60
  ];

  v_booking_campaign_durations integer[] := ARRAY[
    25, 35, 20, 30, 18, 28, 22, 40, 32, 15,
    45, 16, 24, 38, 20, 14, 50, 42, 28, 35
  ];

  -- Campaign descriptions for context
  v_booking_campaign_descriptions text[] := ARRAY[
    'High-profile runway show during Milan Fashion Week featuring spring/summer collections from leading Italian designers.',
    'Beauty campaign showcasing Mediterranean skincare rituals and sun-kissed looks for the summer season.',
    'Editorial spread celebrating diversity and representation in high fashion, featuring models from various backgrounds.',
    'Spring catalog shoot for major retailer, featuring contemporary fashion and lifestyle imagery for e-commerce.',
    'Street style photography capturing Tokyo fashion culture, from Harajuku to Shibuya districts.',
    'Wellness content series featuring Scandinavian lifestyle, mindfulness practices, and clean beauty routines.',
    'Beach and swimwear collection shot in Rio de Janeiro, capturing Brazilian summer vibes and resort fashion.',
    'Lifestyle documentary series following surf culture along Australian coastlines, featuring authentic beach living.',
    'Luxury fashion campaign for Ramadan season, featuring modest fashion and elegant evening wear for Middle Eastern market.',
    'Minimalist beauty campaign showcasing Nordic aesthetics, clean formulations, and natural beauty looks.',
    'Retrospective runway exhibition featuring iconic Prada looks and archival pieces for fashion museum installation.',
    'Italian glamour campaign for beauty and fashion, celebrating Mediterranean elegance and sophistication.',
    'Empowerment-focused editorial series shot in London, celebrating confidence and authentic self-expression.',
    'Spring e-commerce launch featuring fresh inventory photography for major online retail platform.',
    'Documentary-style fashion photography capturing Harajuku street style and Japanese youth culture.',
    'Clean beauty campaign for Scandinavian market, emphasizing natural ingredients and minimalist packaging.',
    'Carnival-inspired swimwear collection featuring vibrant colors and festive Brazilian designs.',
    'Documentary project exploring global surf culture and sustainable ocean practices with lifestyle imagery.',
    'Modest fashion showcase during Fashion Week Doha, featuring emerging designers from the Middle East.',
    'Artistic fashion series exploring avant-garde concepts and experimental photography for gallery exhibition.'
  ];

  -- More realistic booking data with expanded dataset
  v_booking_offsets integer[] := ARRAY[
    3, 5, 8, 10, 12, 15, 18, 20, 22, 25,
    27, 29, 32, 35, 38, 42, 45, 48, 55, 60,
    65, 70, 75, 80, 85, 90, 95, 100
  ];

  v_booking_statuses text[] := ARRAY[
    'completed', 'completed', 'completed', 'completed', 'completed',
    'completed', 'completed', 'completed', 'completed', 'confirmed',
    'completed', 'completed', 'pending', 'completed', 'confirmed',
    'completed', 'completed', 'confirmed', 'completed', 'completed',
    'completed', 'completed', 'confirmed', 'completed', 'completed',
    'pending', 'confirmed', 'completed'
  ];

  v_booking_types text[] := ARRAY[
    'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'confirmed', 'confirmed', 'option', 'confirmed', 'confirmed',
    'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed',
    'option', 'confirmed', 'confirmed'
  ];

  -- More realistic booking rates (varied by talent tier)
  v_booking_rates integer[] := ARRAY[
    450000, 420000, 380000, 350000, 320000, 300000,
    280000, 260000, 240000, 220000, 200000, 180000,
    160000, 140000, 120000, 100000, 90000, 80000,
    70000, 60000, 55000, 50000, 45000, 40000,
    35000, 30000, 25000, 20000
  ];

  v_booking_locations text[] := ARRAY[
    'New York', 'Paris', 'Los Angeles', 'Miami', 'New York', 'Paris',
    'Los Angeles', 'London', 'Milan', 'Barcelona', 'Miami', 'New York',
    'Los Angeles', 'Paris', 'London', 'Berlin', 'Toronto', 'Milan',
    'Barcelona', 'Dubai', 'Sydney', 'Tokyo', 'Singapore', 'Hong Kong',
    'Mumbai', 'São Paulo', 'Mexico City', 'Cape Town'
  ];

  -- License request data with realistic descriptions
  v_license_client_names text[] := ARRAY[
    'Prada Group Marketing',
    'Dolce & Gabbana Beauty',
    'Vogue International',
    'Nordstrom Studios',
    'Comme des Garcons Media',
    'Aesop Skincare',
    'Victoria Secret Global',
    'Billabong International',
    'Gucci Beauty Division',
    'I-D Magazine Ventures',
    'Harper Bazaar Global',
    'Elle Magazine Europe',
    'Marie Claire Studios'
  ];

  v_license_regions text[] := ARRAY[
    'Europe', 'Europe', 'Global', 'North America', 'Other',
    'Europe', 'North America', 'Other', 'Global',
    'Europe', 'North America', 'Global', 'Europe'
  ];

  v_license_statuses text[] := ARRAY[
    'approved', 'pending', 'approved', 'pending', 'approved',
    'approved', 'rejected', 'approved', 'approved', 'pending',
    'approved', 'approved', 'approved'
  ];

  v_license_created_offsets integer[] := ARRAY[
    5, 10, 18, 25, 32, 40, 48, 55, 62, 70, 80, 90, 100
  ];

  v_license_deadline_offsets integer[] := ARRAY[
    90, 45, 120, 30, 85, 75, -10, 60, 100, 35, 110, 95, 80
  ];

  v_license_amounts bigint[] := ARRAY[
    680000, 0, 520000, 0, 480000, 560000, 0, 620000, 590000, 0, 710000, 540000, 490000
  ];

  -- License context descriptions
  v_license_contexts text[] := ARRAY[
    'Exclusive runway and campaign license for European territories. 18-month agreement with extension options for seasonal collections.',
    'Beauty campaign license request for Mediterranean skincare line. Awaiting final brand approval and budget confirmation.',
    'Global editorial license for magazine spread and digital content. Multi-issue agreement with perpetual digital rights.',
    'E-commerce catalog license for North American market. Single season usage with product photography rights.',
    'Asian market license for streetwear campaign. Japanese and Korean territories with digital advertising rights.',
    'Scandinavian wellness campaign license. Clean beauty messaging with sustainable packaging photography.',
    'Lingerie campaign license request - expired before approval process completed.',
    'Global surf lifestyle content license. Multi-territory rights for beach and resort wear imagery.',
    'Luxury beauty ambassador agreement. Global territories with exclusive endorsement and campaign rights.',
    'Editorial license request for youth culture feature. Pending final creative direction approval.',
    'Fashion editorial license for international publication. Multi-edition rights across print and digital.',
    'European beauty campaign license. Continental rights for cosmetics and skincare imagery.',
    'Studio rental and talent license for lifestyle photography. European territories with commercial usage rights.'
  ];

  -- Package data with realistic descriptions
  v_package_titles text[] := ARRAY[
    'Milan Fashion Week Roster 2026',
    'Global Beauty Influencers',
    'Diversity & Inclusion Showcase',
    'Surf & Lifestyle Collective',
    'Avant-Garde Editorial Stars'
  ];

  v_package_descriptions text[] := ARRAY[
    'Elite runway models available for Milan Fashion Week and luxury brand presentations. Proven track record with top Italian fashion houses.',
    'International beauty influencers with authentic engagement across skincare, cosmetics, and wellness verticals. Strong conversion rates.',
    'Curated selection of diverse talent representing various backgrounds, sizes, and identities. Perfect for inclusive brand campaigns.',
    'Authentic surf lifestyle talent with genuine connection to beach culture. Ideal for outdoor, resort, and adventure brands.',
    'Experimental and artistic models for high-concept editorials and gallery exhibitions. Known for unique looks and creative collaboration.'
  ];

  v_package_messages text[] := ARRAY[
    'These runway talents represent the finest in Italian and international fashion. Available for exclusive and non-exclusive bookings.',
    'Our beauty influencers deliver authentic content with measurable ROI. Each has demonstrated strong audience connection and brand alignment.',
    'This showcase celebrates diverse beauty and authentic representation. Each talent brings unique perspectives and engaged communities.',
    'These surf lifestyle creators embody authentic coastal living. Perfect for brands seeking genuine connection to beach culture.',
    'Avant-garde talent for boundary-pushing creative projects. Each model brings artistic vision and editorial experience.'
  ];

  -- Arrays to track created IDs
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
  -- Validation
  IF p_agency_id IS NULL THEN
    RAISE EXCEPTION 'p_agency_id is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.agencies WHERE id = p_agency_id
  ) INTO v_agency_exists;

  IF NOT v_agency_exists THEN
    RAISE EXCEPTION 'Agency % does not exist', p_agency_id;
  END IF;

  -- Reset if requested
  IF p_reset THEN
    -- Get the latest seed session for this agency
    SELECT talent_ids, creator_ids, client_ids, booking_campaign_ids, campaign_ids, booking_ids, request_ids, package_ids
    INTO v_seed_talent_ids, v_seed_creator_ids, v_seed_client_ids, v_seed_booking_campaign_ids, v_seed_campaign_ids, v_seed_booking_ids, v_seed_request_ids, v_seed_package_ids
    FROM public.seed_sessions
    WHERE agency_id = p_agency_id AND session_type = 'demo_analytics'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Convert booking_ids to text array for payments
    SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
    INTO v_seed_booking_id_texts
    FROM public.bookings
    WHERE id = ANY(COALESCE(v_seed_booking_ids, ARRAY[]::uuid[]));

    -- Delete in correct order if seed data exists
    IF array_length(v_seed_package_ids, 1) > 0 THEN
      DELETE FROM public.agency_talent_package_item_assets
      WHERE item_id IN (
        SELECT id FROM public.agency_talent_package_items
        WHERE package_id = ANY(v_seed_package_ids)
      );
      DELETE FROM public.agency_talent_package_items WHERE package_id = ANY(v_seed_package_ids);
      DELETE FROM public.agency_talent_package_interactions WHERE package_id = ANY(v_seed_package_ids);
      DELETE FROM public.agency_talent_package_stats WHERE package_id = ANY(v_seed_package_ids);
      DELETE FROM public.agency_talent_packages WHERE id = ANY(v_seed_package_ids);
    END IF;

    IF array_length(v_seed_request_ids, 1) > 0 THEN
      DELETE FROM public.licensing_payouts WHERE agency_id = p_agency_id AND licensing_request_id = ANY(v_seed_request_ids);
      DELETE FROM public.licensing_requests WHERE id = ANY(v_seed_request_ids);
    END IF;

    IF array_length(v_seed_booking_ids, 1) > 0 THEN
      DELETE FROM public.payments WHERE agency_id = p_agency_id AND (
        booking_id = ANY(v_seed_booking_id_texts)
        OR licensing_request_id = ANY(COALESCE(v_seed_request_ids, ARRAY[]::uuid[]))
        OR COALESCE(talent_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(COALESCE(v_seed_talent_ids, ARRAY[]::uuid[]))
        OR COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid) = ANY(COALESCE(v_seed_campaign_ids, ARRAY[]::uuid[]))
      );
      DELETE FROM public.bookings WHERE id = ANY(v_seed_booking_ids);
    END IF;

    IF array_length(v_seed_booking_campaign_ids, 1) > 0 THEN
      DELETE FROM public.bookings_campaigns WHERE id = ANY(v_seed_booking_campaign_ids);
    END IF;

    IF array_length(v_seed_campaign_ids, 1) > 0 THEN
      DELETE FROM public.campaigns WHERE id = ANY(v_seed_campaign_ids);
    END IF;

    IF array_length(v_seed_talent_ids, 1) > 0 THEN
      DELETE FROM public.agency_talent_relationships WHERE agency_id = p_agency_id AND talent_id = ANY(v_seed_talent_ids);
    END IF;

    IF array_length(v_seed_creator_ids, 1) > 0 THEN
      DELETE FROM public.creator_balances WHERE creator_id = ANY(v_seed_creator_ids);
    END IF;

    IF array_length(v_seed_client_ids, 1) > 0 THEN
      DELETE FROM public.agency_clients WHERE id = ANY(v_seed_client_ids);
    END IF;

    IF array_length(v_seed_talent_ids, 1) > 0 THEN
      DELETE FROM public.agency_users WHERE id = ANY(v_seed_talent_ids);
    END IF;

    IF array_length(v_seed_creator_ids, 1) > 0 THEN
      DELETE FROM public.creators WHERE id = ANY(v_seed_creator_ids);
    END IF;

    -- Delete old seed session
    DELETE FROM public.seed_sessions WHERE agency_id = p_agency_id AND session_type = 'demo_analytics';
  END IF;

  -- Reset arrays
  v_seed_talent_ids := ARRAY[]::uuid[];
  v_seed_creator_ids := ARRAY[]::uuid[];
  v_seed_client_ids := ARRAY[]::uuid[];
  v_seed_booking_campaign_ids := ARRAY[]::uuid[];
  v_seed_campaign_ids := ARRAY[]::uuid[];
  v_seed_booking_ids := ARRAY[]::uuid[];
  v_seed_booking_id_texts := ARRAY[]::text[];
  v_seed_request_ids := ARRAY[]::uuid[];
  v_seed_package_ids := ARRAY[]::uuid[];

  -- Create Clients (no visible seed tags)
  FOR i IN 1..array_length(v_client_companies, 1) LOOP
    INSERT INTO public.agency_clients (
      agency_id, company, contact_name, email, phone, terms, industry,
      next_follow_up_date, created_at, updated_at
    ) VALUES (
      p_agency_id,
      v_client_companies[i],
      v_client_contacts[i],
      v_client_emails[i],
      v_client_phones[i],
      v_client_descriptions[i],
      v_client_industries[i],
      v_today + (i * 7),
      v_now - make_interval(days => 40 - (i * 3)),
      v_now - make_interval(days => 2)
    ) RETURNING id INTO v_client_id;

    v_seed_client_ids := array_append(v_seed_client_ids, v_client_id);
  END LOOP;

  -- Create Talents with Photos (no visible seed tags)
  FOR i IN 1..array_length(v_talent_names, 1) LOOP
    INSERT INTO public.creators (
      full_name, email, city, state, tagline, kyc_status, verified_at,
      profile_photo_url, cameo_front_url,
      age, race, hair_color, hairstyle, eye_color, height_cm, weight_kg, facial_features,
      liveness_status, kyc_provider, kyc_session_id,
      tiktok_handle, portfolio_link,
      created_at, updated_at
    ) VALUES (
      v_talent_names[i],
      format('talent.%s@demo.agency', lower(replace(v_stage_names[i], ' ', ''))),
      v_cities[i],
      v_regions[i],
      v_creator_taglines[i],
      CASE WHEN v_verified_flags[i] THEN 'approved' ELSE 'pending' END,
      CASE WHEN v_verified_flags[i] THEN v_now - make_interval(days => 20 + i) ELSE NULL END,
      v_profile_photos[i],
      v_cameo_front_urls[i],
      v_ages[i],
      v_race_ethnicities[i][1],
      v_hair_colors[i],
      v_hairstyles[i],
      v_eye_colors[i],
      v_height_cm[i],
      v_weight_kg[i],
      ARRAY[v_facial_features[i][1], v_facial_features[i][2], v_facial_features[i][3]],
      v_liveness_statuses[i],
      v_kyc_providers[i],
      v_kyc_session_ids[i],
      v_tiktok_handles[i],
      v_portfolio_links[i],
      v_now - make_interval(days => 140 - (i * 6)),
      v_now - make_interval(days => 5)
    ) RETURNING id INTO v_creator_id;

    v_seed_creator_ids := array_append(v_seed_creator_ids, v_creator_id);

    INSERT INTO public.agency_users (
      agency_id, creator_id, role, status,
      full_legal_name, stage_name, email, phone_number, date_of_birth, city, state_province, country,
      bio_notes, instagram_handle, instagram_followers, engagement_rate,
      consent_status, is_verified_talent, licensing_rate_monthly_cents,
      profile_photo_url, hero_cameo_url, voice_sample_url,
      gender_identity, race_ethnicity, hair_color, eye_color, skin_tone,
      height_feet, height_inches, bust_chest_inches, waist_inches, hips_inches, special_skills,
      total_earnings_cents, active_licenses_count, earnings_30d, projected_earnings,
      photo_urls, total_assets, top_brand, role_type, license_expiry, tattoos, piercings,
      performance_tier_name,
      created_at, updated_at
    ) VALUES (
      p_agency_id, v_creator_id, 'talent', 'active',
      v_talent_names[i], v_stage_names[i],
      format('talent.%s@demo.agency', lower(replace(v_stage_names[i], ' ', ''))),
      v_phone_numbers[i],
      v_dates_of_birth[i]::date,
      v_cities[i], v_regions[i],
      CASE WHEN v_regions[i] IN ('Europe', 'United Kingdom') THEN 'Europe' ELSE 'United States' END,
      v_talent_bios[i],
      v_instagram_handles[i],
      v_follower_counts[i],
      v_engagement_rates[i],
      v_consent_statuses[i],
      v_verified_flags[i],
      v_monthly_rates[i],
      v_profile_photos[i],
      v_hero_cameo_urls[i],
      v_voice_sample_urls[i],
      v_gender_identities[i],
      ARRAY[v_race_ethnicities[i][1], v_race_ethnicities[i][2]],
      v_hair_colors[i],
      v_eye_colors[i],
      v_skin_tones[i],
      v_height_feet[i],
      v_height_inches[i],
      v_bust_chest_inches[i],
      v_waist_inches[i],
      v_hips_inches[i],
      array_remove(ARRAY[v_special_skills[i][1], v_special_skills[i][2], v_special_skills[i][3], v_special_skills[i][4]], NULL),
      0, 0, 0, 0,
      ARRAY[v_profile_photos[i], v_gallery_photo_1[i], v_gallery_photo_2[i], v_gallery_photo_3[i]],
      v_total_assets[i],
      v_top_brands[i],
      v_role_types[i],
      v_license_expiry_dates[i]::date,
      v_tattoos[i],
      v_piercings[i],
      v_performance_tier_names[i],
      v_now - make_interval(days => 135 - (i * 5)),
      v_now - make_interval(days => 3)
    ) RETURNING id INTO v_talent_id;

    v_seed_talent_ids := array_append(v_seed_talent_ids, v_talent_id);

    INSERT INTO public.agency_talent_relationships (
      agency_id, talent_id, creator_id, status,
      licensing_rate_monthly_cents, accept_negotiations, rate_currency,
      created_at, updated_at
    ) VALUES (
      p_agency_id, v_talent_id, v_creator_id, 'active',
      v_monthly_rates[i], true, 'USD',
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

  -- Create Booking Campaigns (no visible seed tags)
  FOR i IN 1..array_length(v_booking_campaign_names, 1) LOOP
    INSERT INTO public.bookings_campaigns (
      agency_id, name, status, duration_days, start_date, created_at, updated_at
    ) VALUES (
      p_agency_id,
      v_booking_campaign_names[i],
      v_booking_campaign_statuses[i],
      v_booking_campaign_durations[i],
      v_today - v_booking_campaign_offsets[i],
      v_now - make_interval(days => v_booking_campaign_offsets[i]),
      v_now - make_interval(days => greatest(v_booking_campaign_offsets[i] - 7, 1))
    ) RETURNING id INTO v_booking_campaign_id;

    v_seed_booking_campaign_ids := array_append(v_seed_booking_campaign_ids, v_booking_campaign_id);

    v_talent_idx := ((i - 1) % array_length(v_seed_talent_ids, 1)) + 1;
    
    v_campaign_type := CASE
      WHEN i % 20 <= 9 THEN 'Endorsement'
      WHEN i % 20 <= 16 THEN 'Photoshoot'
      ELSE 'Event'
    END;
    
    v_brand_vertical := CASE
      WHEN v_booking_campaign_names[i] ILIKE '%Beauty%' OR v_booking_campaign_names[i] ILIKE '%Skincare%' THEN 'Beauty'
      WHEN v_booking_campaign_names[i] ILIKE '%Fashion%' OR v_booking_campaign_names[i] ILIKE '%Style%' THEN 'Fashion'
      WHEN v_booking_campaign_names[i] ILIKE '%Wellness%' OR v_booking_campaign_names[i] ILIKE '%Athleisure%' THEN 'Lifestyle'
      ELSE 'Fashion'
    END;
    
    INSERT INTO public.campaigns (
      agency_id, talent_id, name, campaign_type, brand_vertical, region,
      date, status, notes, created_at, updated_at
    ) VALUES (
      p_agency_id, v_seed_talent_ids[v_talent_idx],
      v_booking_campaign_names[i],
      v_campaign_type, v_brand_vertical, v_regions[v_talent_idx],
      v_today - v_booking_campaign_offsets[i],
      CASE
        WHEN v_booking_campaign_statuses[i] = 'completed' THEN 'Completed'
        WHEN v_booking_campaign_statuses[i] = 'ongoing' THEN 'Confirmed'
        ELSE 'Pending'
      END,
      v_booking_campaign_descriptions[i],
      v_now - make_interval(days => v_booking_campaign_offsets[i]),
      v_now - make_interval(days => greatest(v_booking_campaign_offsets[i] - 6, 1))
    ) RETURNING id INTO v_campaign_id;

    v_seed_campaign_ids := array_append(v_seed_campaign_ids, v_campaign_id);
  END LOOP;

  -- Create Bookings with realistic payment data
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
      agency_user_id, talent_id, talent_name, client_id, client_name,
      type, status, date, all_day, call_time, wrap_time,
      location, location_notes, rate_cents, currency, rate_type,
      notes, created_at, updated_at, campaign_id
    ) VALUES (
      p_agency_id,
      v_seed_talent_ids[v_talent_idx],
      v_stage_names[v_talent_idx],
      v_seed_client_ids[v_client_idx],
      v_client_companies[v_client_idx],
      v_booking_types[i]::public.booking_type,
      v_booking_statuses[i]::public.booking_status,
      v_today - v_booking_offsets[i],
      false, '09:00', '18:00',
      v_booking_locations[i],
      v_booking_campaign_descriptions[((i - 1) % array_length(v_booking_campaign_descriptions, 1)) + 1],
      v_booking_rates[i], 'USD', 'day'::public.booking_rate_type,
      v_booking_campaign_descriptions[((i - 1) % array_length(v_booking_campaign_descriptions, 1)) + 1],
      v_booking_created_at, v_booking_updated_at,
      v_seed_booking_campaign_ids[v_booking_campaign_idx]
    ) RETURNING id INTO v_booking_id;

    v_seed_booking_ids := array_append(v_seed_booking_ids, v_booking_id);
    v_seed_booking_id_texts := array_append(v_seed_booking_id_texts, v_booking_id::text);

    -- Create payment records
    v_payment_status := CASE WHEN i IN (4, 9) THEN 'pending' ELSE 'succeeded' END;
    v_gross_cents := v_booking_rates[i] + (i * 3000);
    v_talent_share_cents := round(v_gross_cents::numeric * 0.75)::bigint;
    v_agency_share_cents := v_gross_cents - v_talent_share_cents;
    v_payment_paid_at := CASE
      WHEN v_payment_status = 'succeeded' THEN v_booking_updated_at + interval '2 days'
      ELSE NULL
    END;

    INSERT INTO public.payments (
      agency_id, talent_id, creator_id, campaign_id, booking_id,
      status, currency_code, gross_cents, talent_earnings_cents, agency_earnings_cents,
      commission_rate, paid_at, created_at
    ) VALUES (
      p_agency_id,
      v_seed_talent_ids[v_talent_idx],
      v_seed_creator_ids[v_talent_idx],
      v_seed_campaign_ids[v_booking_campaign_idx],
      v_booking_id::text,
      v_payment_status, 'USD',
      v_gross_cents, v_talent_share_cents, v_agency_share_cents,
      25.00, v_payment_paid_at,
      v_booking_created_at + interval '1 day'
    );
  END LOOP;

  -- Create Licensing Requests
  FOR i IN 1..array_length(v_license_statuses, 1) LOOP
    v_talent_idx := ((i - 1) % array_length(v_seed_talent_ids, 1)) + 1;
    v_license_created_at := v_now - make_interval(days => v_license_created_offsets[i]);
    v_license_deadline := v_today + v_license_deadline_offsets[i];
    v_decided_at := CASE
      WHEN v_license_statuses[i] IN ('approved', 'rejected') THEN v_license_created_at + interval '2 days'
      ELSE NULL
    END;

    INSERT INTO public.licensing_requests (
      agency_id, talent_id, status, notes, decided_at, created_at,
      client_name, talent_name, license_start_date, license_end_date, deadline,
      context_type, talent_ids, base_rate_monthly_cents, offered_rate_monthly_cents,
      rate_currency, rate_source_type, rate_source_id, regions
    ) VALUES (
      p_agency_id, v_seed_talent_ids[v_talent_idx],
      v_license_statuses[i], v_license_contexts[i], v_decided_at, v_license_created_at,
      v_license_client_names[i],
      v_stage_names[v_talent_idx],
      v_today - greatest(v_license_created_offsets[i] - 2, 1),
      v_license_deadline, v_license_deadline,
      'licensing',
      ARRAY[v_seed_talent_ids[v_talent_idx]],
      v_monthly_rates[v_talent_idx],
      v_monthly_rates[v_talent_idx] + 50000,
      'USD', 'agency_talent',
      v_seed_talent_ids[v_talent_idx]::text,
      v_license_regions[i]
    ) RETURNING id INTO v_request_id;

    v_seed_request_ids := array_append(v_seed_request_ids, v_request_id);

    IF v_license_statuses[i] = 'approved' AND v_license_amounts[i] > 0 THEN
      INSERT INTO public.licensing_payouts (
        licensing_request_id, agency_id, talent_id,
        amount_cents, currency, paid_at,
        talent_earnings_cents, talent_splits,
        commission_rate, platform_fee_cents, net_amount_cents,
        created_at
      ) VALUES (
        v_request_id, p_agency_id, v_seed_talent_ids[v_talent_idx],
        v_license_amounts[i], 'USD',
        v_license_created_at + interval '7 days',
        0,
        jsonb_build_array(
          jsonb_build_object(
            'talent_id', v_seed_talent_ids[v_talent_idx]::text,
            'creator_id', v_seed_creator_ids[v_talent_idx]::text,
            'amount_cents', v_license_amounts[i]
          )
        ),
        20.00, 0, v_license_amounts[i],
        v_license_created_at + interval '7 days'
      );
    END IF;
  END LOOP;

  -- Create Talent Packages (no visible seed tags)
  FOR i IN 1..array_length(v_package_titles, 1) LOOP
    INSERT INTO public.agency_talent_packages (
      agency_id, title, description,
      primary_color, secondary_color, custom_message,
      client_name, client_email,
      allow_comments, allow_favorites, allow_callbacks,
      created_at, updated_at
    ) VALUES (
      p_agency_id,
      v_package_titles[i],
      v_package_descriptions[i],
      '#2563eb', '#f59e0b',
      v_package_messages[i],
      v_client_contacts[((i - 1) % array_length(v_client_contacts, 1)) + 1],
      v_client_emails[((i - 1) % array_length(v_client_emails, 1)) + 1],
      true, true, true,
      v_now - make_interval(days => 20 + (i * 8)),
      v_now - make_interval(days => 5 + i)
    ) RETURNING id INTO v_package_id;

    v_seed_package_ids := array_append(v_seed_package_ids, v_package_id);

    INSERT INTO public.agency_talent_package_stats (
      package_id, view_count, last_viewed_at, unique_visitors
    ) VALUES (
      v_package_id,
      15 + (i * 7),
      v_now - interval '2 days',
      8 + (i * 3)
    );

    -- Add talents to packages
    FOR j IN 1..LEAST(4, array_length(v_seed_talent_ids, 1)) LOOP
      v_talent_idx := ((i + j - 2) % array_length(v_seed_talent_ids, 1)) + 1;
      
      INSERT INTO public.agency_talent_package_items (
        package_id, talent_id, sort_order, created_at
      ) VALUES (
        v_package_id,
        v_seed_talent_ids[v_talent_idx],
        j,
        v_now - make_interval(days => 18 + (i * 7))
      ) RETURNING id INTO v_package_item_id;

      IF j <= 2 THEN
        INSERT INTO public.agency_talent_package_interactions (
          package_id, talent_id, type, content,
          client_name, client_email, created_at
        ) VALUES (
          v_package_id,
          v_seed_talent_ids[v_talent_idx],
          CASE WHEN j = 1 THEN 'favorite' ELSE 'comment' END,
          CASE WHEN j = 1 THEN NULL ELSE format('%s has an excellent portfolio! Very interested in this talent for our upcoming campaign.', v_stage_names[v_talent_idx]) END,
          v_client_contacts[((i - 1) % array_length(v_client_contacts, 1)) + 1],
          v_client_emails[((i - 1) % array_length(v_client_emails, 1)) + 1],
          v_now - make_interval(days => 10 + (i * 3) - j)
        );
      END IF;
    END LOOP;

    INSERT INTO public.agency_talent_package_interactions (
      package_id, talent_id, type, content,
      client_name, client_email, created_at
    ) VALUES (
      v_package_id, NULL, 'comment',
      'Excellent selection of talent. We are reviewing and will get back to you soon with our shortlist.',
      v_client_contacts[((i - 1) % array_length(v_client_contacts, 1)) + 1],
      v_client_emails[((i - 1) % array_length(v_client_emails, 1)) + 1],
      v_now - make_interval(days => 8 + (i * 2))
    );
  END LOOP;

  -- Update talent earnings metrics
  WITH irl AS (
    SELECT
      talent_id,
      SUM(talent_earnings_cents)::bigint AS total_irl,
      SUM(CASE WHEN paid_at IS NOT NULL AND paid_at >= v_thirty_days_ago THEN talent_earnings_cents ELSE 0 END)::bigint AS last_30_irl,
      SUM(CASE WHEN paid_at IS NOT NULL AND paid_at >= v_sixty_days_ago THEN talent_earnings_cents ELSE 0 END)::bigint AS last_60_irl
    FROM public.payments
    WHERE agency_id = p_agency_id AND status = 'succeeded' AND talent_id IS NOT NULL
    GROUP BY talent_id
  ),
  ai AS (
    SELECT
      (split->>'talent_id')::uuid AS talent_id,
      SUM((split->>'amount_cents')::bigint)::bigint AS total_ai,
      SUM(CASE WHEN lp.paid_at >= v_thirty_days_ago THEN (split->>'amount_cents')::bigint ELSE 0 END)::bigint AS last_30_ai,
      SUM(CASE WHEN lp.paid_at >= v_sixty_days_ago THEN (split->>'amount_cents')::bigint ELSE 0 END)::bigint AS last_60_ai
    FROM public.licensing_payouts lp
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(lp.talent_splits, '[]'::jsonb)) AS split
    WHERE lp.agency_id = p_agency_id AND (split->>'talent_id') IS NOT NULL
    GROUP BY (split->>'talent_id')::uuid
  ),
  active_licenses AS (
    SELECT talent_id, COUNT(*)::integer AS active_licenses_count
    FROM public.licensing_requests
    WHERE agency_id = p_agency_id AND status = 'approved' AND talent_id IS NOT NULL
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
    LEFT JOIN irl ON irl.talent_id = au.id
    LEFT JOIN ai ON ai.talent_id = au.id
    LEFT JOIN active_licenses ON active_licenses.talent_id = au.id
    WHERE au.agency_id = p_agency_id AND au.id = ANY(v_seed_talent_ids)
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

  -- Create seed session record to track all created IDs
  INSERT INTO public.seed_sessions (
    agency_id, session_type,
    talent_ids, creator_ids, client_ids,
    booking_campaign_ids, campaign_ids, booking_ids,
    request_ids, package_ids
  ) VALUES (
    p_agency_id, 'demo_analytics',
    v_seed_talent_ids, v_seed_creator_ids, v_seed_client_ids,
    v_seed_booking_campaign_ids, v_seed_campaign_ids, v_seed_booking_ids,
    v_seed_request_ids, v_seed_package_ids
  ) RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'agency_id', p_agency_id,
    'session_id', v_session_id,
    'reset_applied', p_reset,
    'talents_created', COALESCE(array_length(v_seed_talent_ids, 1), 0),
    'clients_created', COALESCE(array_length(v_seed_client_ids, 1), 0),
    'booking_campaigns_created', COALESCE(array_length(v_seed_booking_campaign_ids, 1), 0),
    'campaign_rows_created', COALESCE(array_length(v_seed_campaign_ids, 1), 0),
    'bookings_created', COALESCE(array_length(v_seed_booking_ids, 1), 0),
    'licensing_requests_created', COALESCE(array_length(v_seed_request_ids, 1), 0),
    'talent_packages_created', COALESCE(array_length(v_seed_package_ids, 1), 0),
    'payments_created', 28,
    'licensing_payouts_created', 10,
    'invocation', format(
      'SELECT public.seed_agency_analytics_data_enhanced(''%s''::uuid, true);',
      p_agency_id
    )
  );
END;
$$;

COMMENT ON FUNCTION public.seed_agency_analytics_data_enhanced(uuid, boolean) IS
  'Enhanced seed function with realistic model photos from Unsplash and improved analytics data for compelling demo presentations.';

GRANT EXECUTE ON FUNCTION public.seed_agency_analytics_data_enhanced(uuid, boolean) TO service_role;

COMMIT;
