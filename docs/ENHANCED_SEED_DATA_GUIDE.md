# Enhanced Seed Data Guide

## Overview

The enhanced seed data function creates realistic demo data for client presentations with:

✅ **Professional model photos** from Unsplash (royalty-free, high-quality portraits)  
✅ **Photo galleries** (3-4 photos per talent)  
✅ **Realistic analytics data** (varied follower counts, engagement rates, earnings)  
✅ **Diverse talent profiles** with different markets and specializations  
✅ **Complete booking history** with realistic payment patterns  
✅ **Licensing requests** in various states (pending, approved, rejected)  
✅ **Talent packages** with client interactions

## What's Improved

### 1. **Realistic Profile Photos**
- Each talent has a professional headshot from Unsplash
- Photo galleries with 3-4 additional images per talent
- All images are properly sized (800x1000) and optimized

### 2. **Better Analytics Data**
- **Follower counts**: Range from 38K (rising talent) to 385K (top influencer)
- **Engagement rates**: Realistic rates (3.2% - 6.2%) inversely proportional to follower count
- **Monthly rates**: $3,800 - $12,000 based on reach and engagement
- **Booking rates**: Varied from $450 to $45,000 per booking
- **Revenue patterns**: Realistic 30-day and 60-day earnings with growth trends

### 3. **Diverse Talent Names**
More realistic and diverse names:
- Sofia Martinez (Los Angeles, 385K followers)
- Emma Chen (New York, 275K followers)
- Isabella Laurent (Miami, 198K followers)
- Maya Thompson (London, 156K followers)
- Aisha Patel (Paris, 142K followers)
- And 5 more...

### 4. **Realistic Clients**
- Luxe Beauty Co
- Fashion Forward Inc
- Urban Chic Brands
- Elite Cosmetics
- And 4 more...

## How to Use

### Step 1: Apply the Migration

```bash
# Make sure you're in the project root
cd /home/christian/adorsys/Likelee-AI

# Apply the migration to your Supabase database
supabase db push
```

Or manually run:
```bash
psql $DATABASE_URL -f supabase/migrations/2026-04-06_enhanced_seed_agency_analytics_data.sql
```

### Step 2: Run the Seed Function

Connect to your Supabase database and run:

```sql
-- Replace with your actual agency_id
SELECT public.seed_agency_analytics_data_enhanced(
  'your-agency-id-here'::uuid,
  true  -- Set to true to reset/clear previous seed data
);
```

**Example:**
```sql
SELECT public.seed_agency_analytics_data_enhanced(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  true
);
```

### Step 3: Verify the Data

The function returns a JSON object with counts:

```json
{
  "agency_id": "123e4567-e89b-12d3-a456-426614174000",
  "seed_tag": "analytics_seed:123e4567-e89b-12d3-a456-426614174000",
  "reset_applied": true,
  "talents_created": 10,
  "clients_created": 8,
  "booking_campaigns_created": 12,
  "campaign_rows_created": 12,
  "bookings_created": 22,
  "licensing_requests_created": 13,
  "talent_packages_created": 3,
  "payments_created": 22,
  "licensing_payouts_created": 10
}
```

## What Gets Created

| Data Type | Count | Details |
|-----------|-------|---------|
| **Talents** | 10 | With photos, galleries, social metrics |
| **Clients** | 8 | Beauty, Fashion, and Lifestyle brands |
| **Booking Campaigns** | 12 | Mix of ongoing and completed |
| **Individual Bookings** | 22 | Across 70 days with varied statuses |
| **Licensing Requests** | 13 | Pending (3), Approved (9), Rejected (1) |
| **Talent Packages** | 3 | With client interactions and views |
| **Payment Records** | 22 | With realistic splits (75% talent, 25% agency) |
| **Licensing Payouts** | 10 | For approved licensing deals |

## Resetting/Updating Seed Data

### To Reset Everything
```sql
-- This clears all previous seed data and creates fresh data
SELECT public.seed_agency_analytics_data_enhanced(
  'your-agency-id'::uuid,
  true  -- p_reset = true
);
```

### To Add More Data (Without Reset)
```sql
-- This adds to existing seed data without clearing
SELECT public.seed_agency_analytics_data_enhanced(
  'your-agency-id'::uuid,
  false  -- p_reset = false
);
```

**⚠️ Warning:** Setting `p_reset = false` will create duplicate entries. Use `true` for demos.

## Photo Sources

All photos are from **Unsplash**, a free stock photo platform:
- License: Free for commercial use
- No attribution required (but appreciated)
- High-quality professional portraits
- URLs use Unsplash's image optimization API

Example URL format:
```
https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=1000&fit=crop
```

Parameters:
- `w=800` - width in pixels
- `h=1000` - height in pixels
- `fit=crop` - smart cropping to maintain aspect ratio

## Customizing the Seed Data

### To Use Different Photos

Edit the `v_profile_photos` and `v_photo_galleries` arrays in the migration file:

```sql
v_profile_photos text[] := ARRAY[
  'https://your-image-host.com/photo1.jpg',
  'https://your-image-host.com/photo2.jpg',
  -- ... add 10 total
];
```

### To Adjust Follower Counts or Rates

```sql
v_follower_counts bigint[] := ARRAY[
  500000,  -- Increase for mega-influencer
  300000,
  -- ... adjust as needed
];

v_monthly_rates bigint[] := ARRAY[
  1500000,  -- $15,000/month
  1000000,  -- $10,000/month
  -- ... adjust as needed
];
```

### To Change Talent Names

```sql
v_talent_names text[] := ARRAY[
  'Your Name 1',
  'Your Name 2',
  -- ... 10 names total
];

v_stage_names text[] := ARRAY[
  'Name1',
  'Name2',
  -- ... matching stage names
];
```

## Cleaning Up Seed Data

To remove all seed data for an agency:

```sql
-- First, run the function with reset=true but don't insert new data
-- Or manually delete using the seed tag

DELETE FROM public.payments 
WHERE agency_id = 'your-agency-id'::uuid
  AND (booking_id IN (
    SELECT id::text FROM public.bookings 
    WHERE notes = 'analytics_seed:your-agency-id'
  ));

-- Continue with other tables in reverse dependency order...
-- (The function handles this automatically when p_reset = true)
```

## Troubleshooting

### Issue: Photos not loading

**Cause:** Unsplash URLs might be blocked by firewall or ad blocker.

**Solution:** 
1. Check browser console for errors
2. Try different image hosts (Cloudinary, ImgIX, or your own CDN)
3. Upload photos to Supabase Storage and use those URLs

### Issue: UUIDs showing in UI instead of names

**Cause:** UI components displaying `id` instead of `name` or `stage_name`.

**Solution:** Check the UI mapping - talent names are stored in:
- `agency_users.full_legal_name`
- `agency_users.stage_name`
- `creators.full_name`

### Issue: Analytics showing $0 revenue

**Cause:** Payment records might not be marked as "succeeded".

**Solution:** Check payment status:
```sql
SELECT status, COUNT(*) 
FROM payments 
WHERE agency_id = 'your-agency-id'::uuid
GROUP BY status;
```

All should show `succeeded` except 2 `pending` payments.

## Demo Best Practices

### Before the Demo

1. **Run the seed function 24 hours before** to ensure all timestamps look natural
2. **Verify all photos are loading** by checking the roster view
3. **Check analytics dashboard** to ensure numbers look realistic
4. **Test talent packages** to ensure client interactions display properly

### During the Demo

1. **Start with Dashboard Overview** - shows aggregate metrics
2. **Show Roster View** - highlight the diverse talent pool with photos
3. **Open a Talent Profile** - show the complete profile with gallery
4. **Review Active Campaigns** - demonstrate booking management
5. **Show Licensing Requests** - highlight AI licensing capabilities
6. **Present Talent Packages** - show how to send curated selections to clients

### After the Demo

- Keep the seed data for follow-up questions
- Reset when needed for fresh demos
- Consider customizing talent names/photos for specific client verticals

## Support

For issues or questions:
1. Check the migration file: `supabase/migrations/2026-04-06_enhanced_seed_agency_analytics_data.sql`
2. Review Supabase logs for errors
3. Verify all dependencies are installed
4. Check that profile photo URLs are accessible

---

**Last Updated:** 2026-04-06  
**Migration File:** `2026-04-06_enhanced_seed_agency_analytics_data.sql`  
**Function Name:** `public.seed_agency_analytics_data_enhanced(uuid, boolean)`
