# Brand Payment Methods - Setup Instructions

## Prerequisites

- Node.js 18+ (for frontend)
- Rust 1.70+ (for backend)
- Supabase CLI
- Stripe account (test mode)
- Git

## Step 1: Database Setup

### 1.1 Run Migration

```bash
# Navigate to project root
cd .kilo/worktrees/bold-trawler

# Run the migration
supabase migration up

# Or if using Supabase CLI directly:
supabase db push
```

### 1.2 Verify Migration

```bash
# Check that tables were created
supabase db list

# Should see:
# - brand_payment_methods (new table)
# - brands (updated with new columns)
```

### 1.3 Verify RLS Policies

```bash
# Connect to Supabase database
supabase db shell

# Check RLS is enabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'brand_payment_methods';

# Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'brand_payment_methods';
```

## Step 2: Environment Configuration

### 2.1 Frontend Environment Variables

Create or update `.kilo/worktrees/bold-trawler/likelee-ui/.env.local`:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# API Configuration
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### 2.2 Backend Environment Variables

Create or update `.kilo/worktrees/bold-trawler/likelee-server/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/likelee

# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
```

### 2.3 Get Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Copy:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)
4. Add to environment files

## Step 3: Frontend Setup

### 3.1 Install Dependencies

```bash
cd likelee-ui

# Install or update dependencies
npm install

# Or if using yarn
yarn install
```

### 3.2 Verify Stripe Package

```bash
# Check that Stripe packages are installed
npm list @stripe/react-stripe-js @stripe/js

# Should show:
# @stripe/react-stripe-js@2.x.x
# @stripe/js@3.x.x
```

### 3.3 Start Development Server

```bash
# Start the frontend dev server
npm run dev

# Should output:
# VITE v4.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173
```

## Step 4: Backend Setup

### 4.1 Build Backend

```bash
cd likelee-server

# Build the project
cargo build

# Or for development with hot reload:
cargo watch -x run
```

### 4.2 Run Backend

```bash
# Start the backend server
cargo run

# Should output:
# Server running on 0.0.0.0:3000
```

### 4.3 Verify Routes

```bash
# Check that routes are registered
curl http://localhost:3000/health

# Should return 200 OK
```

## Step 5: Testing Setup

### 5.1 Create Test Brand Account

1. Go to http://localhost:5173
2. Sign up as a brand
3. Complete brand profile setup
4. Navigate to Settings → Billing & Payment

### 5.2 Test Payment Method Addition

1. Click "Add Card" button
2. Use test card: `4242 4242 4242 4242`
3. Enter any future expiry date (e.g., 12/25)
4. Enter any 3-digit CVC (e.g., 123)
5. Click "Add Card"
6. Verify success message appears
7. Verify card appears in list

### 5.3 Test Payment Method Management

1. Add multiple test cards
2. Set different cards as primary
3. Delete a card
4. Verify soft delete in database

## Step 6: Database Verification

### 6.1 Check Payment Methods Table

```sql
-- Connect to Supabase
supabase db shell

-- View payment methods
SELECT * FROM brand_payment_methods;

-- View brand payment method info
SELECT 
  id,
  stripe_payment_method_id,
  payment_method_last_four,
  payment_method_brand,
  payment_method_exp_month,
  payment_method_exp_year
FROM brands
WHERE id = 'YOUR_BRAND_ID';
```

### 6.2 Check RLS Policies

```sql
-- Verify RLS is enabled
SELECT * FROM pg_tables 
WHERE tablename = 'brand_payment_methods' 
AND schemaname = 'public';

-- Should show: relrowsecurity = true

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'brand_payment_methods';

-- Should show 4 policies:
-- - Brands can view their own payment methods
-- - Brands can insert their own payment methods
-- - Brands can update their own payment methods
-- - Brands can delete their own payment methods
```

## Step 7: API Testing

### 7.1 Get Authentication Token

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "brand@example.com",
    "password": "password123"
  }'

# Save the token from response
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

### 7.2 Test Setup Intent Endpoint

```bash
curl -X POST http://localhost:3000/api/brand/billing/payment-method/setup-intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Should return:
# {
#   "client_secret": "seti_1234567890..."
# }
```

### 7.3 Test Get Payment Methods Endpoint

```bash
curl -X GET http://localhost:3000/api/brand/billing/payment-methods \
  -H "Authorization: Bearer $TOKEN"

# Should return:
# {
#   "payment_methods": [...],
#   "primary_payment_method": {...}
# }
```

### 7.4 Test Set Primary Endpoint

```bash
curl -X POST http://localhost:3000/api/brand/billing/payment-method/set-primary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_payment_method_id": "pm_1234567890"
  }'

# Should return: 200 OK
```

### 7.5 Test Delete Endpoint

```bash
curl -X POST http://localhost:3000/api/brand/billing/payment-method/delete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_payment_method_id": "pm_1234567890"
  }'

# Should return: 200 OK
```

## Step 8: Troubleshooting

### Issue: Stripe Keys Not Working

**Solution:**
1. Verify keys are in correct environment files
2. Check keys are for test mode (start with `pk_test_` and `sk_test_`)
3. Restart both frontend and backend servers
4. Check browser console for errors

### Issue: Database Migration Failed

**Solution:**
```bash
# Check migration status
supabase migration list

# Rollback if needed
supabase migration down

# Re-run migration
supabase migration up

# Check for errors
supabase db shell
```

### Issue: RLS Policies Not Working

**Solution:**
```bash
# Verify RLS is enabled
ALTER TABLE brand_payment_methods ENABLE ROW LEVEL SECURITY;

# Re-create policies
-- Run the migration again or manually create policies
```

### Issue: CORS Errors

**Solution:**
1. Check backend CORS configuration
2. Verify frontend URL is in allowed origins
3. Check that credentials are being sent with requests

### Issue: Card Not Appearing After Adding

**Solution:**
1. Check browser console for JavaScript errors
2. Check network tab for failed API requests
3. Check server logs for backend errors
4. Verify database insert succeeded

## Step 9: Deployment Checklist

Before deploying to production:

- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Stripe keys verified (use production keys)
- [ ] Frontend builds without errors
- [ ] Backend compiles without errors
- [ ] All tests pass
- [ ] Manual testing completed
- [ ] Error handling tested
- [ ] Security review completed
- [ ] Performance tested
- [ ] Monitoring configured
- [ ] Backup plan in place

## Step 10: Monitoring & Maintenance

### 10.1 Monitor Stripe Events

```bash
# Watch Stripe webhook logs
# Go to Stripe Dashboard → Developers → Webhooks
# Look for events related to payment methods
```

### 10.2 Monitor Database

```bash
# Check for failed operations
SELECT * FROM brand_payment_methods 
WHERE deleted_at IS NOT NULL;

# Check for orphaned records
SELECT * FROM brand_payment_methods 
WHERE brand_id NOT IN (SELECT id FROM brands);
```

### 10.3 Monitor Application Logs

```bash
# Check backend logs for errors
tail -f logs/backend.log

# Check frontend console for errors
# Open browser DevTools → Console
```

## Quick Reference

| Component | Command | Port |
|-----------|---------|------|
| Frontend | `npm run dev` | 5173 |
| Backend | `cargo run` | 3000 |
| Database | `supabase db shell` | 5432 |
| Stripe | Dashboard | - |

## Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Stripe Documentation](https://stripe.com/docs/stripe-js/react)
- [Project Documentation](./docs/BRAND_PAYMENT_METHODS.md)

## Next Steps

1. ✅ Complete setup
2. ✅ Run manual tests
3. ✅ Deploy to staging
4. ✅ Run integration tests
5. ✅ Deploy to production
6. ✅ Monitor for issues

---

**Setup Complete!** 🎉

You're now ready to test the brand payment methods feature. Start with the frontend and backend servers, then navigate to the Billing & Payment settings to test adding a payment method.
