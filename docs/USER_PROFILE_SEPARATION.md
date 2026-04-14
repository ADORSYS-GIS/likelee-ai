# User Profile vs Organization Profile Separation

## Current Issue
All team members share the organization's profile instead of having their own individual profiles.

## Problem Details
- Team members see organization name/picture instead of their own
- No individual identity for team members
- Confusing UX - users think they're logged in as the organization

## Proposed Solution

### 1. Separate User Profile from Organization Profile

#### User Profile (Individual)
Stored in: `auth.users` and `public.creator_profiles` (or new table)

**Fields:**
- `id` (user_id)
- `email`
- `full_name` (personal name)
- `profile_photo_url` (personal avatar)
- `display_name`
- `phone`
- `timezone`
- `language_preference`
- `notification_settings`
- `created_at`
- `updated_at`

#### Organization Profile (Shared)
Stored in: `public.agencies` or `public.brands`

**Fields:**
- `id` (organization_id)
- `organization_name` / `agency_name` / `company_name`
- `organization_logo_url`
- `email` (organization contact)
- `phone` (organization phone)
- `website`
- `description`
- `subscription_tier`
- `stripe_customer_id`
- `stripe_subscription_id`
- `plan_tier`
- `seats_limit`
- `created_at`
- `updated_at`

### 2. Database Schema Changes

```sql
-- Create individual user profiles table
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    display_name TEXT,
    profile_photo_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    language_preference TEXT DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate existing user data from organizations to user_profiles
INSERT INTO public.user_profiles (id, full_name, profile_photo_url)
SELECT 
    u.id,
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'profile_photo_url'
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' IN ('agency', 'brand')
ON CONFLICT (id) DO NOTHING;

-- Add index for performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(id);
```

### 3. Update AuthProvider to Load Both Profiles

```typescript
// In AuthProvider.tsx

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  profile_photo_url: string;
  phone?: string;
  timezone?: string;
  language_preference?: string;
}

interface OrganizationProfile {
  id: string;
  name: string;
  logo_url: string;
  email: string;
  subscription_tier: string;
  plan_tier: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
}

interface AuthContextValue {
  // ... existing fields
  user?: User | null;
  userProfile?: UserProfile | null;        // NEW: Individual profile
  organizationProfile?: OrganizationProfile | null;  // NEW: Organization profile
  // ...
}
```

### 4. Update Profile Fetching Logic

```typescript
// In AuthProvider.tsx - fetchProfile function

const fetchProfile = async () => {
  // Get user metadata (individual)
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get individual user profile
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  // Get organization profile based on role
  const organizationType = user.user_metadata?.role;
  const organizationId = user.user_metadata?.organization_id || user.id;
  
  const { data: organizationProfile } = await supabase
    .from(organizationType === 'agency' ? 'agencies' : 'brands')
    .select('*')
    .eq('id', organizationId)
    .single();
  
  return {
    ...user,
    userProfile,
    organizationProfile,
  };
};
```

### 5. Update UI Components

#### Navigation/Header
```tsx
// Show individual user's profile
<Avatar>
  <img src={userProfile?.profile_photo_url} />
</Avatar>
<div>
  <div className="font-semibold">{userProfile?.full_name}</div>
  <div className="text-xs text-muted">{organizationProfile?.name}</div>
</div>
```

#### Settings Page
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="personal">Personal Profile</TabsTrigger>
    <TabsTrigger value="organization">Organization Settings</TabsTrigger>
  </TabsList>
  
  <TabsContent value="personal">
    {/* Individual user settings */}
    <Input label="Full Name" value={userProfile?.full_name} />
    <Input label="Profile Photo" value={userProfile?.profile_photo_url} />
    <Input label="Email" value={userProfile?.email} />
    <Input label="Timezone" value={userProfile?.timezone} />
  </TabsContent>
  
  <TabsContent value="organization">
    {/* Only show if has manage_billing permission */}
    {hasPermission('manage_billing') ? (
      <>
        <Input label="Organization Name" value={organizationProfile?.name} />
        <Input label="Logo" value={organizationProfile?.logo_url} />
        <SubscriptionManagement />
      </>
    ) : (
      <div>You don't have permission to manage organization settings</div>
    )}
  </TabsContent>
</Tabs>
```

### 6. Update Backend Endpoints

```rust
// Add endpoint to update individual user profile
pub async fn update_user_profile(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdateUserProfileRequest>,
) -> Result<Json<UserProfile>, (StatusCode, String)> {
    // Update user_profiles table
    // Only allow users to update their own profile
}

// Keep existing organization profile endpoints
// but ensure they check for manage_billing permission
pub async fn update_organization_profile(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<UpdateOrganizationRequest>,
) -> Result<Json<Organization>, (StatusCode, String)> {
    let access = require_organization_permission(&state, &user, Permission::ManageBilling).await?;
    // Update organization...
}
```

## Benefits

1. **Clear Separation**: Users understand they have their own identity
2. **Better UX**: Team members see their own name/picture
3. **Individual Settings**: Each user can have their own preferences
4. **Permission-Based Access**: Organization settings require permissions
5. **Scalable**: Works for future features like personal dashboards

## Migration Strategy

1. **Phase 1**: Create `user_profiles` table
2. **Phase 2**: Migrate existing user data
3. **Phase 3**: Update AuthProvider to load both profiles
4. **Phase 4**: Update UI components
5. **Phase 5**: Add individual profile editing
6. **Phase 6**: Update backend endpoints

## Files to Modify

- `supabase/migrations/` - New migration for user_profiles table
- `likelee-ui/src/auth/AuthProvider.tsx` - Load both profiles
- `likelee-ui/src/components/Navigation.tsx` - Show individual profile
- `likelee-ui/src/pages/Settings.tsx` - Separate personal/org tabs
- `likelee-server/src/main.rs` - Add user profile endpoints
- `likelee-ui/src/types/index.ts` - Add UserProfile type

## Questions to Consider

1. Should team members be able to edit their own profile? **Yes**
2. Should profile photos be stored in Supabase Storage? **Yes**
3. Should notification preferences be per-user or per-organization? **Per-user**
4. Should timezone be used for calendar/scheduling features? **Yes**
5. Should we allow users to have multiple organization memberships? **Future enhancement**

## Implementation Priority

**High Priority:**
- [ ] Create user_profiles table
- [ ] Update AuthProvider
- [ ] Update navigation header

**Medium Priority:**
- [ ] Add profile editing UI
- [ ] Add backend endpoints
- [ ] Update settings page

**Low Priority:**
- [ ] Add notification preferences
- [ ] Add timezone support
- [ ] Add language preferences
