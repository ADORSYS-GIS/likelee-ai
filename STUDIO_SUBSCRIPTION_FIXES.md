# Studio Subscription Fixes - Production Deployment Guide

## Summary
Two critical bugs were fixed affecting the studio subscription flow:
1. **Metadata Key Mismatch** - Users not receiving correct credits
2. **Incorrect Redirect URL** - Users redirected to wrong page after subscription

---

## Bug #1: Metadata Key Mismatch (CRITICAL)

### Problem
Users subscribing to studio plans were not receiving the correct credit amounts. The checkout created sessions with metadata keys that didn't match what the webhook handlers expected.

### Root Cause
- Checkout set: `credits` and `plan_type` 
- Webhook expected: `studio_credits` and `studio_plan`
- Result: Credits defaulted to 2000 instead of purchased amount, plan defaulted to "pro"

### Fix Applied
**Commit:** `7e059c8e`

**Files Changed:**
- `likelee-server/src/billing.rs` (3 lines)
- `likelee-server/src/payouts.rs` (7 lines)

**Changes:**
1. Recurring subscription metadata: `credits` → `studio_credits`, `plan_type` → `studio_plan`
2. One-time purchase session metadata: `plan_type` → `studio_plan`
3. Webhook handler now uses correct `studio_plan` variable

### Impact
✅ Users will receive correct credit amounts after subscription
✅ Plan assignments (lite/pro) will be preserved correctly

---

## Bug #2: Incorrect Redirect URL

### Problem
After completing Stripe checkout for studio subscription, users were redirected to `/subscribe` instead of `/studiosubscribe`, causing them to land on the wrong page.

### Root Cause
- Production `.env` had: `STRIPE_STUDIO_SUCCESS_URL=.../subscribe?success=1&session_id=...`
- Should be: `STRIPE_STUDIO_SUCCESS_URL=.../studiosubscribe?success=1&session_id=...`
- StudioSubscribe page had no redirect handling for success parameter

### Fix Applied
**Commit:** `7fece6de`

**Files Changed:**
- `likelee-ui/src/pages/StudioSubscribe.tsx` (29 lines)

**Changes:**
1. Added `useSearchParams` hook to detect success/cancel parameters
2. Added redirect logic: success → redirect to `/studio`
3. Added toast notification for canceled payments
4. Wallet data refresh on successful payment

### Impact
✅ Users will be redirected to studio after successful subscription
✅ Wallet will show updated credits immediately
✅ Clear feedback for canceled payments

---

## Production Deployment Checklist

### 1. Environment Variable Update (CRITICAL)

Update the production `.env` file:

```bash
# OLD (WRONG):
STRIPE_STUDIO_SUCCESS_URL=https://your-domain.com/subscribe?success=1&session_id={CHECKOUT_SESSION_ID}

# NEW (CORRECT):
STRIPE_STUDIO_SUCCESS_URL=https://your-domain.com/studiosubscribe?success=1&session_id={CHECKOUT_SESSION_ID}
```

⚠️ **IMPORTANT**: This must be updated BEFORE deploying the code changes!

### 2. Database Migration
No database changes required - existing schema is compatible.

### 3. Code Deployment
Deploy the changes from branch `fix/studio-credits-metadata-keys`:
- Commit: `7e059c8e` (metadata fixes)
- Commit: `7fece6de` (redirect fixes)

### 4. Post-Deployment Verification

Test the complete flow:
1. Subscribe to a studio plan (lite/pro)
2. Complete Stripe checkout
3. Verify redirect to `/studio` (not `/subscribe`)
4. Check wallet shows correct credits
5. Verify correct plan is set in wallet

### 5. Monitoring

After deployment, monitor for:
- Stripe webhook events: `checkout.session.completed`
- Log messages: "studio credits purchased via stripe checkout"
- Credit amounts should match purchased tier
- Plan should match selection (lite/pro)

---

## Technical Details

### Metadata Flow (Fixed)

**Recurring Subscription:**
```
Checkout Creation:
  subscription_data.metadata = {
    user_id: "...",
    billing_domain: "studio",
    studio_credits: "2000",      // ← Fixed key
    studio_plan: "pro"           // ← Fixed key
  }

Invoice Webhook:
  Reads studio_credits and studio_plan from subscription metadata
  Credits user with correct amount
  Sets correct plan
```

**One-Time Purchase:**
```
Checkout Creation:
  metadata = {
    billing_domain: "studio",
    user_id: "...",
    credits: "2000",
    studio_plan: "pro"           // ← Fixed key
  }

Checkout Webhook:
  Reads credits from metadata
  Reads studio_plan from metadata  // ← Fixed key
  Credits user
  Sets plan
```

### Redirect Flow (Fixed)

```
1. User completes Stripe checkout
2. Stripe redirects to: /studiosubscribe?success=1&session_id=...
3. StudioSubscribe detects success parameter
4. Refreshes wallet data
5. Redirects to: /studio (with replace: true)
6. User sees updated credits and correct plan
```

---

## Related Files

### Backend
- `likelee-server/src/billing.rs` - Checkout session creation
- `likelee-server/src/payouts.rs` - Webhook handlers
- `likelee-server/src/studio/wallet.rs` - Credit management

### Frontend
- `likelee-ui/src/pages/StudioSubscribe.tsx` - Subscription page

### Configuration
- `likelee-server/.env` - Environment variables
- `likelee-server/.env.example` - Example configuration

---

## Questions?

If users still report issues after deployment:
1. Check Stripe webhook logs for errors
2. Verify metadata keys in webhook payload
3. Check `studio_credit_transactions` table for duplicates
4. Check `studio_wallets` table for correct balance
5. Review server logs for "studio credits purchased" messages
