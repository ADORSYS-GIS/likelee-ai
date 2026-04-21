# Brand Payment Methods - Quick Start Guide

## What Was Built

A complete payment method management system for brands to securely add and manage bank cards for platform payments.

## Key Components

### Frontend
- **BrandSettingsBilling.tsx** - Main UI component showing payment methods
- **PaymentMethodModal.tsx** - Modal for adding new cards

### Backend
- **billing.rs** - Four new handlers for payment method operations
- **router.rs** - Four new API routes

### Database
- **brand_payment_methods** table - Stores payment method history
- **brands** table - Updated with payment method columns

## Quick Setup

### 1. Database Migration
```bash
# Run the migration
supabase migration up

# Or manually run:
# supabase/migrations/2026-04-21_brand_payment_methods.sql
```

### 2. Environment Variables
Ensure these are set:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Test the Feature

#### Add a Payment Method
1. Go to Brand Settings → Billing & Payment
2. Click "Add Card"
3. Enter test card: 4242 4242 4242 4242
4. Any future date for expiry
5. Any 3-digit CVC
6. Click "Add Card"

#### Manage Payment Methods
- View all saved cards
- See primary payment method indicator
- Delete cards with trash icon
- Set any card as primary

## API Endpoints

### Create Setup Intent
```bash
curl -X POST http://localhost:3000/api/brand/billing/payment-method/setup-intent \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Payment Methods
```bash
curl -X GET http://localhost:3000/api/brand/billing/payment-methods \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Set Primary Payment Method
```bash
curl -X POST http://localhost:3000/api/brand/billing/payment-method/set-primary \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stripe_payment_method_id": "pm_1234567890"}'
```

### Delete Payment Method
```bash
curl -X POST http://localhost:3000/api/brand/billing/payment-method/delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stripe_payment_method_id": "pm_1234567890"}'
```

## File Structure

```
likelee-ui/
├── src/
│   ├── api/
│   │   └── functions.ts (UPDATED - added 4 functions)
│   └── components/
│       └── brand-dashboard/
│           └── settings/
│               ├── BrandSettingsBilling.tsx (UPDATED)
│               └── PaymentMethodModal.tsx (NEW)

likelee-server/
├── src/
│   ├── billing.rs (UPDATED - added 4 handlers)
│   └── router.rs (UPDATED - added 4 routes)

supabase/
└── migrations/
    └── 2026-04-21_brand_payment_methods.sql (NEW)

docs/
└── BRAND_PAYMENT_METHODS.md (NEW)
```

## Testing Checklist

- [ ] Add a test card
- [ ] Verify card appears in list
- [ ] Set card as primary
- [ ] Add another card
- [ ] Switch primary cards
- [ ] Delete a card
- [ ] Test with invalid card
- [ ] Test network error handling

## Test Cards

| Card Type | Number | Expiry | CVC |
|-----------|--------|--------|-----|
| Visa | 4242 4242 4242 4242 | Any future | Any 3 digits |
| Mastercard | 5555 5555 5555 4444 | Any future | Any 3 digits |
| Amex | 3782 822463 10005 | Any future | Any 4 digits |
| Declined | 4000 0000 0000 0002 | Any future | Any 3 digits |

## Common Tasks

### View Payment Methods in Database
```sql
SELECT * FROM brand_payment_methods 
WHERE brand_id = 'YOUR_BRAND_ID' 
AND deleted_at IS NULL;
```

### Check Primary Payment Method
```sql
SELECT 
  stripe_payment_method_id,
  payment_method_last_four,
  payment_method_brand,
  payment_method_exp_month,
  payment_method_exp_year
FROM brands 
WHERE id = 'YOUR_BRAND_ID';
```

### Soft Delete a Payment Method
```sql
UPDATE brand_payment_methods 
SET deleted_at = NOW() 
WHERE stripe_payment_method_id = 'pm_1234567890';
```

## Troubleshooting

### Card Not Appearing After Adding
1. Check browser console for errors
2. Verify Stripe API key is correct
3. Check network tab for failed requests
4. Review server logs

### Cannot Delete Card
1. Verify you own the card (RLS policy)
2. Check authentication token
3. Verify card exists in database

### Setup Intent Creation Fails
1. Check Stripe API key
2. Verify customer creation succeeded
3. Check Stripe dashboard for errors

## Integration with Billing

The payment methods are ready to integrate with:
- Subscription payments
- Add-on purchases
- Invoice payments
- Billing portal

## Security Notes

- ✅ Card data never stored locally
- ✅ Stripe handles all sensitive data
- ✅ RLS policies enforce access control
- ✅ All operations require authentication
- ✅ Soft deletes maintain audit trail

## Next Steps

1. **Deploy to Staging**
   - Run migration
   - Deploy backend
   - Deploy frontend
   - Test thoroughly

2. **Monitor**
   - Check Stripe webhook logs
   - Monitor error rates
   - Track usage metrics

3. **Enhance**
   - Add payment method expiration alerts
   - Implement automatic retry logic
   - Add payment history tracking

## Support

For detailed information, see:
- `docs/BRAND_PAYMENT_METHODS.md` - Full documentation
- `PAYMENT_METHODS_IMPLEMENTATION_SUMMARY.md` - Implementation details

## Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| UI Component | `BrandSettingsBilling.tsx` | Display payment methods |
| Modal | `PaymentMethodModal.tsx` | Add new card |
| API Functions | `functions.ts` | Frontend API calls |
| Backend Handlers | `billing.rs` | Server-side logic |
| Routes | `router.rs` | API endpoints |
| Database | `brand_payment_methods` | Store payment data |

---

**Ready to deploy!** 🚀
