# MFA Role Restriction Implementation (Optional)

## Overview

This document provides the implementation to restrict MFA (Two-Factor Authentication) to Brand users only, as per the requirement: "MFA is just for brand users not all the users in the system."

## Current State

- MFA is accessible via `/TwoFactorSetup` route
- Route is protected by `ProtectedRoute` (authentication only, no role check)
- MFA settings are only shown in Brand Dashboard UI
- Agency and Creator users can technically access MFA by manually navigating to the URL

## Implementation

### Step 1: Add Role Restriction to Route

**File:** `likelee-ui/src/pages/index.tsx`

**Change:**
```typescript
// BEFORE
<Route
  path="/TwoFactorSetup"
  element={
    <ProtectedRoute>
      <TwoFactorSetup />
    </ProtectedRoute>
  }
/>

// AFTER
<Route
  path="/TwoFactorSetup"
  element={
    <ProtectedRoute allowedRoles={["brand"]}>
      <TwoFactorSetup />
    </ProtectedRoute>
  }
/>
```

### Step 2: Add User-Friendly Error Message (Optional)

**File:** `likelee-ui/src/pages/TwoFactorSetup.tsx`

Add a check at the beginning of the component:

```typescript
export default function TwoFactorSetup() {
  const { mfa, authenticated, initialized, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Add this check
  useEffect(() => {
    if (initialized && profile && profile.role !== "brand") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Two-factor authentication is only available for Brand accounts.",
      });
      navigate(getDashboardPath(profile), { replace: true });
    }
  }, [initialized, profile, navigate]);
  
  // ... rest of component
}
```

### Step 3: Verify ProtectedRoute Behavior

The `ProtectedRoute` component already handles role-based access control. When `allowedRoles={["brand"]}` is set:

1. It checks if the user's role is in the allowed roles list
2. If not, it shows a LoadingSpinner and redirects
3. The redirect logic is already implemented in ProtectedRoute

**File:** `likelee-ui/src/auth/ProtectedRoute.tsx` (no changes needed)

The existing code already handles this:
```typescript
if (allowedRoles && !allowedRoles.some((r) => effectiveRoles.includes(r))) {
  return <LoadingSpinner />;
}
```

## Testing

### Test Case 1: Brand User Access
1. Log in as a Brand user
2. Navigate to Settings → Security
3. Click "Enable 2FA Protection"
4. **Expected:** TwoFactorSetup page loads successfully

### Test Case 2: Agency User Blocked
1. Log in as an Agency user
2. Manually navigate to `/TwoFactorSetup`
3. **Expected:** Redirected away or shown access denied message

### Test Case 3: Creator User Blocked
1. Log in as a Creator user
2. Manually navigate to `/TwoFactorSetup`
3. **Expected:** Redirected away or shown access denied message

### Test Case 4: Team Member (Brand Organization)
1. Log in as a team member of a Brand organization
2. Check if they should have access to MFA
3. **Decision needed:** Should team members of Brand orgs have MFA access?

## Decision Required

**Question:** Should team members (reviewers, editors, admins) of Brand organizations have access to MFA?

**Option A: Only Brand Owners**
- Restrict to `profile.role === "brand" && !profile.membership_role`
- Team members cannot enable MFA

**Option B: All Brand Organization Members**
- Allow `profile.role === "brand"` (includes team members)
- Team members can enable MFA for their own accounts

**Recommendation:** Option B - Allow all Brand organization members to enable MFA for their own accounts. This provides better security for all users with access to Brand data.

## Implementation Status

**Status:** NOT IMPLEMENTED

This is an optional enhancement. The current implementation already restricts MFA access through UI design (only shown in Brand Dashboard). The route-level restriction adds an extra layer of security but is not strictly necessary unless there's a compliance or security requirement.

## Files to Modify (if implementing)

1. `likelee-ui/src/pages/index.tsx` - Add `allowedRoles={["brand"]}` to TwoFactorSetup route
2. `likelee-ui/src/pages/TwoFactorSetup.tsx` - (Optional) Add user-friendly error message

## Rollback

If this change causes issues, simply remove the `allowedRoles` prop from the route:

```typescript
<Route
  path="/TwoFactorSetup"
  element={
    <ProtectedRoute>
      <TwoFactorSetup />
    </ProtectedRoute>
  }
/>
```
