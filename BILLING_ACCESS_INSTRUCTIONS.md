# Billing Access Fix Instructions

## Problem
You can invite team members but cannot access billing/management pages. This is because:
- The billing system checks for `manage_billing` permission
- Permissions are determined by your role in `organization_memberships` table
- Your membership might be missing, have wrong role, or not linked to correct user ID

## Agency ID
`6eeb46ec-738b-45fe-a56f-51cc84eed00f`

## Solution Steps

### Step 1: Find Your Actual User ID
1. Open Supabase SQL Editor (or your database client)
2. Run this query (replace with your email):
```sql
SELECT 
    u.id as your_user_id,
    u.email as your_email,
    u.raw_user_meta_data->>'role' as your_role
FROM auth.users u
WHERE u.email = 'YOUR_EMAIL_HERE'
LIMIT 1;
```
3. **Note down your user_id** - you'll need it for Step 3

### Step 2: Check Current Membership
Run this to see what's in your membership table:
```sql
SELECT 
    om.organization_type,
    om.organization_id,
    om.user_id,
    om.email,
    om.role,
    om.status
FROM public.organization_memberships om
WHERE om.organization_id = '6eeb46ec-738b-45fe-a56f-51cc84eed00f';
```

### Step 3: Apply the Fix

#### If your user_id MATCHES the agency_id (6eeb46ec-738b-45fe-a56f-51cc84eed00f):
Run the query in `diagnose_billing_access.sql` under "OPTION A"

#### If your user_id is DIFFERENT:
Run the query in `diagnose_billing_access.sql` under "OPTION B"
- Replace `YOUR_ACTUAL_USER_ID_FROM_STEP_1` with your user ID from Step 1
- Replace `YOUR_EMAIL_HERE` with your email

### Step 4: Clear Cache
**CRITICAL:** After running the SQL fix, you MUST do ONE of these:
- **Log out and log back in** (easiest)
- **Wait 5 minutes** (cache expiration time)
- **Restart the backend server** (if you have access)

### Step 5: Test
1. Navigate to billing/management page
2. You should now have access

## Why This Happens
- The permission system caches your access for 5 minutes
- If your membership record is missing or incorrect, you get denied
- Even though you're the owner, the code checks the membership table

## Files Created
- `diagnose_billing_access.sql` - Full diagnostic and fix script
- This file (`BILLING_ACCESS_INSTRUCTIONS.md`) - Step-by-step guide

## Still Not Working?
If you've tried everything and still have issues:
1. Run the full diagnostic script: `diagnose_billing_access.sql`
2. Check the server logs for errors
3. Verify you're logged in with the correct account
4. Contact support with the results of the diagnostic queries
