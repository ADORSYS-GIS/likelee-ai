# Quick Start: Setting Up Demo Data for Client Presentation

## 🎯 Goal
Create realistic, professional-looking demo data with real model photos for your client presentation.

## ✅ What You'll Get

After running the enhanced seed function, your demo will have:

- **10 diverse talents** with professional headshots and photo galleries
- **Real model photos** from Unsplash (royalty-free, high-quality)
- **Realistic analytics** (follower counts: 38K - 385K, engagement rates: 3.2% - 6.2%)
- **22 bookings** spanning 70 days with varied statuses
- **13 licensing requests** (3 pending, 9 approved, 1 rejected)
- **3 talent packages** with client interactions
- **Complete payment history** with realistic revenue distribution

## 🚀 Quick Start (3 Steps)

### Step 1: Apply the Migration

```bash
cd /home/christian/adorsys/Likelee-AI
supabase db push
```

### Step 2: Get Your Agency ID

In Supabase SQL Editor or your database client:

```sql
-- Find your agency ID
SELECT id, name FROM agencies WHERE name LIKE '%YourAgencyName%';
```

Copy the `id` value (it will look like: `123e4567-e89b-12d3-a456-426614174000`)

### Step 3: Run the Seed Function

```sql
-- Replace 'YOUR_AGENCY_ID' with the actual ID from Step 2
SELECT public.seed_agency_analytics_data_enhanced(
  'YOUR_AGENCY_ID'::uuid,
  true
);
```

**Example:**
```sql
SELECT public.seed_agency_analytics_data_enhanced(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  true
);
```

**Expected output:**
```json
{
  "talents_created": 10,
  "clients_created": 8,
  "bookings_created": 22,
  "licensing_requests_created": 13,
  "talent_packages_created": 3
}
```

## ✨ What's New (vs Old Seed)

| Feature | Old Seed | Enhanced Seed |
|---------|----------|---------------|
| Profile Photos | ❌ No photos | ✅ Professional Unsplash portraits |
| Photo Galleries | ❌ None | ✅ 3-4 photos per talent |
| Talent Names | Generic | ✅ Diverse, realistic names |
| Follower Counts | Unrealistic | ✅ Realistic distribution (38K-385K) |
| Engagement Rates | Flat | ✅ Inversely proportional to followers |
| Monthly Rates | Basic | ✅ $3,800 - $12,000 based on influence |
| Booking Rates | Repetitive | ✅ Varied ($450 - $45,000) |
| Revenue Growth | Static | ✅ Realistic 30-day/60-day trends |

## 👥 Talent Profiles Created

| Name | Location | Followers | Monthly Rate | Status |
|------|----------|-----------|--------------|--------|
| Sofia Martinez | Los Angeles | 385K | $12,000 | ✅ Verified |
| Emma Chen | New York | 275K | $9,500 | ✅ Verified |
| Isabella Laurent | Miami | 198K | $8,200 | ✅ Verified |
| Maya Thompson | London | 156K | $7,200 | ✅ Verified |
| Aisha Patel | Paris | 142K | $6,800 | ✅ Verified |
| Olivia Williams | Milan | 128K | $6,200 | ✅ Verified |
| Zara Hassan | Barcelona | 95K | $5,500 | ✅ Verified |
| Luna Rodriguez | Toronto | 78K | $4,800 | ✅ Verified |
| Aria Johnson | Sydney | 52K | $4,200 | ⏳ Pending |
| Mia Anderson | Berlin | 38K | $3,800 | ⏳ Pending |

## 🖼️ Photo Examples

Each talent has:
- **1 profile photo** - Professional headshot
- **3-4 gallery photos** - Additional portfolio images

All photos are:
- High resolution (800x1000px)
- Professionally shot
- Diverse representation
- Royalty-free from Unsplash

## 📊 Demo Walkthrough Checklist

Use this checklist during your client demo:

### Dashboard Overview
- [ ] Show total revenue metrics
- [ ] Highlight active campaigns
- [ ] Point out talent diversity

### Roster View
- [ ] Filter by verification status
- [ ] Show talent profiles with photos
- [ ] Demonstrate sorting by earnings

### Talent Profile
- [ ] Open Sofia Martinez (top performer)
- [ ] Show her photo gallery
- [ ] Review her booking history
- [ ] Highlight her social metrics

### Analytics Dashboard
- [ ] Revenue breakdown by campaign type
- [ ] Top performing talents
- [ ] Regional distribution
- [ ] Brand verticals breakdown

### Licensing Pipeline
- [ ] Show pending requests (3)
- [ ] Review approved deals (9)
- [ ] Explain AI licensing revenue

### Talent Packages
- [ ] Open "Spring 2026 Elite Collection"
- [ ] Show client interactions
- [ ] Demonstrate package analytics

## 🔄 Resetting for a New Demo

If you need fresh data:

```sql
-- This will clear old seed data and create new data
SELECT public.seed_agency_analytics_data_enhanced(
  'YOUR_AGENCY_ID'::uuid,
  true  -- Reset flag
);
```

## ⚠️ Important Notes

### Before the Demo
1. ✅ Run seed function 24 hours before the demo (for natural timestamps)
2. ✅ Verify all photos load correctly
3. ✅ Check that names display (not UUIDs)
4. ✅ Test on the same network you'll use for the demo

### During the Demo
1. 🎯 Start with the dashboard for "wow factor"
2. 📸 Emphasize the professional photos
3. 📊 Show realistic analytics
4. 💼 Demonstrate end-to-end workflow

### Photo Loading Issues?
If Unsplash photos don't load:
1. Check your internet connection
2. Verify no ad blocker is blocking images
3. Try a different browser
4. Alternative: Upload photos to Supabase Storage (see docs)

## 🎨 Customizing for Your Client

### Change Talent Names
Edit these arrays in the migration file (lines 30-44):

```sql
v_talent_names text[] := ARRAY[
  'Custom Name 1',
  'Custom Name 2',
  -- ... 10 total
];
```

### Use Your Own Photos
Replace URLs in `v_profile_photos` (lines 47-56):

```sql
v_profile_photos text[] := ARRAY[
  'https://your-cdn.com/model1.jpg',
  'https://your-cdn.com/model2.jpg',
  -- ... 10 total
];
```

### Adjust Revenue Numbers
Modify `v_monthly_rates` (lines 114-123):

```sql
v_monthly_rates bigint[] := ARRAY[
  1500000,  -- $15,000/month for top talent
  1200000,  -- $12,000/month
  -- ... adjust as needed
];
```

## 📞 Troubleshooting

### Problem: No photos showing
**Solution:** Check browser console for errors. Photos are loaded from Unsplash.

### Problem: UUIDs instead of names
**Solution:** The UI should display `stage_name` or `full_legal_name`. Check that seed data was created correctly.

### Problem: $0 revenue showing
**Solution:** Check payment statuses are "succeeded":
```sql
SELECT status, COUNT(*) FROM payments 
WHERE agency_id = 'YOUR_AGENCY_ID'::uuid
GROUP BY status;
```

### Problem: Timestamps look wrong
**Solution:** The seed function uses relative dates. Run it 24 hours before your demo for best results.

## 📚 Full Documentation

For detailed information, see: [docs/ENHANCED_SEED_DATA_GUIDE.md](./docs/ENHANCED_SEED_DATA_GUIDE.md)

## 🎉 You're Ready!

Your demo data is now set up with:
- ✅ Professional model photos
- ✅ Realistic analytics
- ✅ Complete booking history
- ✅ Active licensing pipeline
- ✅ Client interactions

**Good luck with your presentation!** 🚀

---

**Created:** 2026-04-06  
**Migration:** `supabase/migrations/2026-04-06_enhanced_seed_agency_analytics_data.sql`  
**Function:** `public.seed_agency_analytics_data_enhanced(uuid, boolean)`
