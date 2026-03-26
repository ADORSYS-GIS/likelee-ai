# Creator Profile Fields Fix

## Changes Made

### 1. Fixed Birthday Field Mapping
- **Issue**: Frontend was sending `birthday` but database column is `birthdate`
- **Fix**: Updated all references to map `creator.birthday` (UI state) to `birthdate` (database column)
- **Files Changed**: `likelee-ai/likelee-ui/src/pages/CreatorDashboard.tsx`

### 2. Removed Instagram Followers Field
- **Reason**: Field not needed in creators table (exists in agency_users table only)
- **Changes**:
  - Removed input field from profile form UI
  - Removed from profile submission payload
  - Removed from creator state initialization
  - Removed from profile data loading
  - Set followers display to "0" in public profile

### 3. Removed Engagement Rate Field
- **Reason**: Field not needed in creators table (exists in agency_users table only)
- **Changes**:
  - Removed input field from profile form UI
  - Removed from profile submission payload
  - Removed from creator state initialization
  - Removed from profile data loading

### 4. Verified Existing Fields
The following fields already have correct mappings and should now persist properly:
- **Race**: Maps to `race` column (text)
- **Eye Color**: Maps to `eye_color` column (text)
- **Height (cm)**: Maps to `height_cm` column (integer)
- **Hair Color**: Maps to `hair_color` column (text)

## Database Schema

### Creators Table Columns (Physical Attributes)
```sql
age integer,
race text,
hair_color text,
hairstyle text,
eye_color text,
height_cm integer,
weight_kg integer,
facial_features text[],
birthdate date  -- Note: column name is birthdate, not birthday
```

## Testing Checklist

After deploying these changes:
- [ ] Date of Birth field saves and displays correctly
- [ ] Race field saves and displays correctly
- [ ] Eye Color field saves and displays correctly
- [ ] Height (cm) field saves and displays correctly
- [ ] Hair Color field saves and displays correctly
- [ ] Instagram Followers field is no longer visible in the UI
- [ ] Engagement Rate field is no longer visible in the UI
- [ ] Profile saves without errors
- [ ] Profile data persists after page refresh

## Technical Details

### Field Mapping (UI → Database)
```typescript
// Profile submission payload
{
  birthdate: creator.birthday,  // UI uses 'birthday', DB uses 'birthdate'
  race: creator.race,
  eye_color: creator.eye_color,
  height_cm: parseOptionalInt(creator.height_cm),
  hair_color: creator.hair_color,
  // instagram_followers - REMOVED
  // engagement_rate - REMOVED
}
```

### Profile Data Loading (Database → UI)
```typescript
setCreator({
  birthday: profile.birthdate,  // DB 'birthdate' → UI 'birthday'
  race: profile.race,
  eye_color: profile.eye_color,
  height_cm: String(profile.height_cm),
  hair_color: profile.hair_color,
  // instagram_followers - REMOVED
  // engagement_rate - REMOVED
});
```

## Why These Changes Work

1. **Birthday/Birthdate**: The database column is `birthdate`, but the UI state uses `birthday`. The mapping now correctly translates between the two.

2. **Race, Eye Color, Height**: These columns already exist in the `creators` table with the correct names. The frontend was already sending them correctly, so they should now persist properly.

3. **Instagram Followers & Engagement Rate**: These fields don't exist in the `creators` table (they're in `agency_users` and `scouting_prospects` tables). Removing them from the creator profile form prevents confusion and failed save attempts.

## Notes

- The backend (`upsert_profile` in `creators.rs`) accepts any JSON fields and passes them to Supabase
- If a column doesn't exist, Supabase will ignore it (no error, but no save either)
- The backend has debug logging: `tracing::info!(?body, "upsert_profile payload")` to inspect what's being sent
