# Agency Analytics Seed Data

This migration creates a seed function that populates an agency's database with realistic demo data for the analytics dashboard.

## Dashboard Data Overview

The seeded data creates a dashboard with the following characteristics:

### Roster Health
- **10 talent members** (Carla, Clemence, Julia, Aaron, Elena, Maya, Sophie, Olivia, Isabella, Emma)
- **9 out of 10 active** (90% active rate)
- Emma is the inactive member (missing consent status)

### Revenue
- **Total monthly revenue**: ~$37.7K
- **Top 3 Revenue Generators**:
  1. **Carla Rodriguez**: $6,800
  2. **Clemence Dubois**: $5,400
  3. **Julia Bennett**: $5,200

### Pending Actions
- **3 licensing requests** (pending approval)
- **1 expiring license** (expires within 30 days)
- **1 compliance issue** (Emma's missing consent)

### New Talent Performance
- **Aaron Chen**: Recently onboarded, pending first booking
- Average time to first booking: ~12 days

### Revenue Breakdown

**By Campaign Type:**
- Endorsement: 45% (displayed as "Social Media" in dashboard)
- Photoshoot: 35% (displayed as "E-commerce" in dashboard)
- Event: 20% (displayed as "Traditional" in dashboard)

> **Note**: The database uses campaign_type values of 'Endorsement', 'Photoshoot', and 'Event' due to a database constraint. The frontend maps these to display names for the dashboard.

**By Brand Vertical:**
- Beauty: 40%
- Fashion: 35%
- Lifestyle: 25%

**By Region:**
- North America: 60%
- Europe: 30%
- Other: 10%

### Licensing Pipeline
- **Pending Approval**: 3
- **Active**: 6
- **Expiring Soon (30d)**: 1
- **Total This Month**: 13

## Usage

To seed data for an agency, run:

```sql
SELECT public.seed_agency_analytics_data(
  '<agency_id>'::uuid,
  true  -- reset (true to clear existing seed data first)
);
```

### Example

```sql
-- Get your agency ID first
SELECT id FROM public.agencies WHERE company_name = 'CM Models';

-- Then seed data (replace with actual agency ID)
SELECT public.seed_agency_analytics_data(
  '12345678-1234-1234-1234-123456789abc'::uuid,
  true
);
```

## What Gets Created

1. **10 Talent Members** with varied profiles:
   - Different follower counts (89K - 245K)
   - Varied engagement rates (4.1% - 5.8%)
   - Mix of locations (NY, Paris, LA, Miami, etc.)
   - Different regions (North America, Europe, Other)

2. **8 Agency Clients** from Beauty, Fashion, and Lifestyle industries

3. **12 Booking Campaigns** spread across:
   - Social Media campaigns (5)
   - E-commerce campaigns (4)
   - Traditional campaigns (3)

4. **22 Individual Bookings** with varied:
   - Rates ($250 - $3,400)
   - Statuses (completed, confirmed, pending)
   - Locations across major cities

5. **13 Licensing Requests**:
   - 3 pending (awaiting approval)
   - 6 approved and active
   - 1 approved but expiring within 30 days
   - 1 rejected
   - 2 approved but already expired

6. **Talent Packages** for client presentations

> **Note**: Job postings are not included in the seed data because they require a brand user in the auth.users table, which cannot be easily created in a seed function.

## Data Tagging

All seeded data is tagged with:
- `notes` or `bio_notes` field: `analytics_seed:<agency_id>`
- `company` or `title` prefix: `[seed:<short_id>]`

This allows for easy cleanup when resetting.

## Reset Functionality

When called with `p_reset = true`, the function will:
1. Find all previously seeded data by tag
2. Delete it in the correct order (respecting foreign keys)
3. Create fresh seed data

## Important Notes

1. **Revenue Calculation**: Revenue is calculated from completed bookings and approved licensing requests in the last 30 days
2. **Active Talent**: Talent with `status = 'active'` and complete consent
3. **Expiring Licenses**: Licenses with end dates within 30 days from today
4. **Compliance Issues**: Talent with `consent_status != 'complete'` or `is_verified_talent = false`

## Customization

To adjust the data to match different scenarios, modify these arrays in the function:

- `v_talent_names` - Talent member names
- `v_booking_rates` - Individual booking rates (affects revenue)
- `v_license_statuses` - License approval statuses
- `v_booking_campaign_names` - Campaign names (determines campaign type/vertical)
- `v_client_industries` - Client industry mix

## Performance

The function creates approximately:
- 10 talent records
- 8 client records
- 12 campaigns
- 22 bookings
- 22 payment records
- 13 licensing requests
- ~10 licensing payouts
- 3 talent packages

Execution time: ~1 second depending on database load.
