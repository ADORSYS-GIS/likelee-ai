# Instagram Handle Storage Issue - Analysis

## Problem
The Instagram Handle field in the creator profile UI persists values, but which column in the database actually stores it: `instagram_handle` or `platform_handle`?

## Answer
The Instagram Handle is stored in the **`platform_handle`** column, NOT the `instagram_handle` column.

## How It Works

### Frontend Code Flow

**When SAVING (CreatorDashboard.tsx line ~4633):**
```typescript
const profileData = {
  platform_handle: creator.instagram_handle?.replace("@", ""),
  // ... other fields
};
```
- Reads from UI state: `creator.instagram_handle` (includes @ symbol)
- Removes the @ symbol
- Sends to backend as: `platform_handle`
- Saves to database column: `platform_handle`

**When LOADING (CreatorDashboard.tsx line ~2693):**
```typescript
setCreator({
  instagram_handle: profile.platform_handle
    ? `@${profile.platform_handle}`
    : prev.instagram_handle,
  // ... other fields
});
```
- Reads from database column: `platform_handle`
- Adds @ symbol for display
- Stores in UI state as: `creator.instagram_handle`

### Database Columns

Both columns exist in the `creators` table:
- ✅ `platform_handle` - **ACTIVELY USED** (stores Instagram handle without @)
- ❌ `instagram_handle` - **UNUSED/LEGACY** (always NULL)

## Backend Code

The backend SELECT query includes:

```rust
// dashboard.rs - line ~50
let select_cols = "id, email, full_name, city, state, bio, vibes, content_types, 
                   industries, primary_platform, platform_handle, tiktok_handle, 
                   portfolio_link, visibility, public_profile_visible, ...";
```

Columns in the `creators` table:
- ✅ `platform_handle` - EXISTS and USED
- ✅ `tiktok_handle` - EXISTS and USED
- ✅ `portfolio_link` - EXISTS and USED
- ✅ `primary_platform` - EXISTS
- ✅ `vibes` - EXISTS
- ✅ `visibility` - EXISTS

## Columns That Actually Exist in Creators Table

From migration `0001_core_profiles.sql`:
- `id`, `full_name`, `email`, `city`, `state`
- `profile_photo_url`, `profile_avatar_id`
- `age`, `race`, `hair_color`, `hairstyle`, `eye_color`
- `height_cm`, `weight_kg`, `facial_features`
- `tagline`
- `kyc_status`, `liveness_status`, `kyc_provider`, `kyc_session_id`, `verified_at`
- `created_at`, `updated_at`

From migration `0004_business_logic_and_pricing.sql`:
- `accept_negotiations`, `content_restrictions`, `brand_exclusivity`
- `content_types`, `industries`

From migration `0005_external_integrations.sql`:
- `tiktok_handle`, `portfolio_link`
- `creatify_job_id`, `creatify_job_status`, etc.

From migration `0029_creator_public_visibility.sql`:
- `public_profile_visible`

From migration `2026-03-04_weekly_licensing_rates_rollout.sql`:
- `base_weekly_price_cents`

## Why Two Columns?

The `instagram_handle` column appears to be legacy/unused. The system uses `platform_handle` because:
1. It's platform-agnostic (can store handles from any social platform)
2. The `primary_platform` column indicates which platform the handle is for
3. More flexible for multi-platform support

## Current Behavior

✅ **Working correctly:**
1. User enters "@johndoe" in Instagram Handle field
2. Frontend saves "johndoe" to `platform_handle` column
3. Frontend reads from `platform_handle` and displays "@johndoe"
4. Value persists across page refreshes

❌ **Unused column:**
- The `instagram_handle` column remains NULL and is not used by the application

## Verification Query

To verify where the Instagram Handle is stored:

```sql
SELECT 
  email,
  instagram_handle,  -- This will be NULL
  platform_handle,   -- This contains the actual value
  primary_platform
FROM creators 
WHERE email = 'your-creator@example.com';
```

Expected result:
- `instagram_handle`: NULL
- `platform_handle`: "johndoe" (without @)
- `primary_platform`: "instagram" or NULL

## Note on Column Naming

- **UI Field**: "Instagram Handle"
- **UI State**: `creator.instagram_handle` (includes @ symbol)
- **Database Column**: `platform_handle` (stores without @ symbol)
- **Reason**: The column is named `platform_handle` (not `instagram_handle`) because it can store handles from any platform (Instagram, TikTok, etc.), with `primary_platform` indicating which platform it's for
