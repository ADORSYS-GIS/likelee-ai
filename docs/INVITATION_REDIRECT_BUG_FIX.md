# Invitation Redirect Bug Fix

## Issue Description

When organization owners (brands or agencies) invite users to their organization, after the user accepts the invitation and verifies their email, they experience an infinite loading state on the dashboard. The user must manually refresh the page to see the dashboard.

## Root Cause

The bug was caused by a **race condition** in the profile loading logic after invitation acceptance:

1. **Backend creates membership** → `organization_memberships` table is updated
2. **Frontend calls refreshProfile()** → Queries Supabase for profile data
3. **Race condition** → Membership data not yet available in Supabase query results (replication lag or cache)
4. **Profile set to null** → No membership found, profile is set to null
5. **Dashboard redirect** → User redirected to dashboard with null profile
6. **Infinite loading** → ProtectedRoute waits for profile, shows LoadingSpinner forever
7. **Manual refresh works** → By then, membership data is available

### Console Log Evidence:

**Before refresh (broken state):**
```
[AuthProvider] fetchProfile START
[AuthProvider] No profile found, setting profile to null
[AuthProvider] fetchProfile END { finalProfileState: "NULL" }
```

**After refresh (working state):**
```
[AuthProvider] fetchProfile START {userId: '...', role: 'brand', ...}
[AuthProvider] Found membership, using organization profile
```

## Solution

Implemented a **retry mechanism** in `refreshProfile()` specifically for brand/agency users to handle the race condition:

1. **Retry Logic**: For brand/agency users, retry fetching the profile up to 3 times with 500ms delays
2. **Success Check**: After each attempt, check if profile was successfully loaded
3. **Early Exit**: If profile is found, return immediately without further retries
4. **Fallback**: If all retries fail, log a warning (user can still refresh manually)

### Implementation Details:

**File:** `likelee-ui/src/auth/AuthProvider.tsx`

**Changes:**

1. **Modified `refreshProfile()` function** to add retry logic for brand/agency users:
   ```typescript
   refreshProfile: async () => {
     if (user) {
       const isOAuth = user.app_metadata?.provider === "google";
       const roleHint = getUserRoleHint(user) || readAuthIntent()?.role || "";
       
       // For brand/agency users, retry fetching profile to handle race condition
       if (roleHint === "brand" || roleHint === "agency") {
         const maxRetries = 3;
         const retryDelay = 500; // ms
         
         for (let attempt = 0; attempt < maxRetries; attempt++) {
           // Reset fetching ref to allow retry
           if (attempt > 0) {
             fetchingRef.current = null;
           }
           
           await fetchProfile(...);
           
           // Check if profile was successfully loaded
           if (profileRef.current && profileRef.current.id === user.id) {
             return; // Success!
           }
           
           // Wait before retrying
           if (attempt < maxRetries - 1) {
             await new Promise(resolve => setTimeout(resolve, retryDelay));
           }
         }
       }
     }
   }
   ```

2. **Added explicit return type** to `fetchProfile()`:
   ```typescript
   const fetchProfile = async (...): Promise<void> => {
   ```

3. **Added state synchronization** after each `setProfile()` call:
   ```typescript
   setProfile(newProfile);
   await new Promise(resolve => setTimeout(resolve, 0));
   ```

## Why This Works

1. **Handles Replication Lag**: Supabase may have slight delays in making newly created data available in queries
2. **Handles Cache Issues**: Backend invalidates cache, but frontend query may hit stale cache
3. **Non-Blocking**: Uses async/await with delays, doesn't block UI
4. **Targeted**: Only applies retry logic to brand/agency users (where the issue occurs)
5. **Fast Success**: If profile is found on first attempt, no delay
6. **Graceful Degradation**: If all retries fail, user can still refresh manually (same as before)

## Files Modified

- `likelee-ui/src/auth/AuthProvider.tsx`
  - Modified `fetchProfile()` function signature to explicitly return `Promise<void>`
  - Added `await new Promise(resolve => setTimeout(resolve, 0))` after all `setProfile()` calls (4 locations)
  - **Modified `refreshProfile()` function** to add retry logic for brand/agency users:
    - Retries up to 3 times with 500ms delays
    - Checks if profile was successfully loaded after each attempt
    - Resets `fetchingRef` between retries to allow re-fetching
    - Only applies to brand/agency roles (where invitation acceptance occurs)

## Performance Impact

- **Best case**: Profile found on first attempt → No delay (same as before)
- **Typical case**: Profile found on 2nd attempt → 500ms delay (acceptable for invitation flow)
- **Worst case**: Profile not found after 3 attempts → 1000ms total delay, then user can refresh manually

The retry mechanism only activates for brand/agency users during profile refresh, so it doesn't impact normal navigation or other user types.

## Testing Recommendations

1. **Test invitation flow for brands:**
   - Create a brand organization
   - Invite a new user
   - Accept invitation and verify email
   - Verify dashboard loads without requiring refresh

2. **Test invitation flow for agencies:**
   - Create an agency organization
   - Invite a new user
   - Accept invitation and verify email
   - Verify dashboard loads without requiring refresh

3. **Test with existing users:**
   - Invite a user who already has an account
   - Accept invitation with OTP verification
   - Verify dashboard loads correctly

4. **Test different roles:**
   - Test with reviewer, editor, admin roles
   - Verify each role sees appropriate dashboard

## MFA Clarification

**Current MFA Implementation:**
- MFA is technically available for ALL authenticated users (no role restrictions on `/TwoFactorSetup` route)
- MFA is OPTIONAL, not mandatory
- MFA is only accessible via Brand Dashboard → Settings → Security
- MFA uses Supabase native TOTP-based authentication
- Agency and Creator dashboards do NOT have links to MFA settings

**Actual Behavior:**
While the `/TwoFactorSetup` route is accessible to any authenticated user, only Brand users can easily access it through the UI. Agency and Creator users would need to manually navigate to the URL.

**Recommendation:**
The requirement states "MFA is just for brand users not all the users in the system." The current implementation is **mostly correct** - MFA is only exposed in the Brand Dashboard UI. However, to fully enforce this:

### Option 1: Add Role Restriction (Recommended)
Add role checking to the TwoFactorSetup route to explicitly block non-brand users:

```typescript
// In likelee-ui/src/pages/index.tsx
<Route
  path="/TwoFactorSetup"
  element={
    <ProtectedRoute allowedRoles={["brand"]}>
      <TwoFactorSetup />
    </ProtectedRoute>
  }
/>
```

### Option 2: Keep Current Implementation
The current implementation is acceptable if:
- Only Brand users need MFA in the UI
- It's okay if tech-savvy users from other roles manually access the URL
- The security model doesn't require strict enforcement

**Current Status:** MFA is functionally restricted to Brand users through UI design, but not technically enforced at the route level.

## Related Files

- `likelee-ui/src/pages/TeamInviteLanding.tsx` - Invitation acceptance UI
- `likelee-ui/src/auth/ProtectedRoute.tsx` - Dashboard protection logic
- `likelee-server/src/team/handlers.rs` - Backend invitation acceptance
- `likelee-ui/src/api/functions.ts` - API client functions
