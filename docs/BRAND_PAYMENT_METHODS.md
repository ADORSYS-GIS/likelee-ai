# Brand Payment Methods Implementation

## Overview

This document describes the implementation of bank card payment method management for brands in the Likelee platform. Brands can now connect their bank cards which will be used for platform payments.

## Features

- **Add Payment Methods**: Brands can securely add bank cards using Stripe's Payment Element
- **Manage Multiple Cards**: Store and manage multiple payment methods
- **Set Primary Payment Method**: Designate a card as the primary payment method for billing
- **Delete Payment Methods**: Remove cards from the account
- **Secure Storage**: Card data is never stored on our servers; Stripe handles all sensitive data

## Architecture

### Database Schema

#### New Table: `brand_payment_methods`
Stores payment method history and metadata for audit trails.

```sql
CREATE TABLE public.brand_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL,
  card_last_four text NOT NULL,
  card_brand text NOT NULL,
  card_exp_month integer NOT NULL,
  card_exp_year integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

#### Updated Table: `brands`
Added columns to store the primary payment method information:

- `stripe_payment_method_id`: Stripe's payment method ID
- `payment_method_last_four`: Last 4 digits of the card
- `payment_method_brand`: Card brand (Visa, Mastercard, etc.)
- `payment_method_exp_month`: Card expiration month
- `payment_method_exp_year`: Card expiration year
- `payment_method_updated_at`: Timestamp of last update

### Frontend Components

#### `BrandSettingsBilling.tsx`
Main billing settings component that displays:
- Billing address
- Billing email
- Tax identification
- List of payment methods with management options

**Key Features:**
- Loads payment methods on component mount
- Displays primary payment method with visual indicator
- Allows adding new cards via modal
- Allows deleting payment methods
- Shows loading states and error handling

#### `PaymentMethodModal.tsx`
Modal dialog for adding new payment methods.

**Key Features:**
- Uses Stripe's CardElement for secure card input
- Creates a SetupIntent for secure payment method attachment
- Handles card validation and error messages
- Shows success confirmation
- Integrates with Stripe's Payment Element

### Backend API Endpoints

#### 1. Create Setup Intent
**Endpoint:** `POST /api/brand/billing/payment-method/setup-intent`

Creates a Stripe SetupIntent for secure card attachment.

**Response:**
```json
{
  "client_secret": "seti_1234567890"
}
```

**Handler:** `create_brand_payment_method_setup_intent()`

#### 2. Get Payment Methods
**Endpoint:** `GET /api/brand/billing/payment-methods`

Retrieves all payment methods for the authenticated brand.

**Response:**
```json
{
  "payment_methods": [
    {
      "id": "uuid",
      "stripe_payment_method_id": "pm_1234567890",
      "card_last_four": "4242",
      "card_brand": "visa",
      "card_exp_month": 12,
      "card_exp_year": 2025,
      "is_active": true,
      "created_at": "2026-04-21T10:00:00Z"
    }
  ],
  "primary_payment_method": {
    "stripe_payment_method_id": "pm_1234567890",
    "card_last_four": "4242",
    "card_brand": "visa",
    "card_exp_month": 12,
    "card_exp_year": 2025
  }
}
```

**Handler:** `get_brand_payment_methods()`

#### 3. Set Primary Payment Method
**Endpoint:** `POST /api/brand/billing/payment-method/set-primary`

Sets a payment method as the primary for billing.

**Request:**
```json
{
  "stripe_payment_method_id": "pm_1234567890"
}
```

**Handler:** `set_brand_primary_payment_method()`

#### 4. Delete Payment Method
**Endpoint:** `POST /api/brand/billing/payment-method/delete`

Soft-deletes a payment method (marks as deleted but keeps history).

**Request:**
```json
{
  "stripe_payment_method_id": "pm_1234567890"
}
```

**Handler:** `delete_brand_payment_method()`

### API Functions (Frontend)

Located in `src/api/functions.ts`:

```typescript
// Create setup intent for card attachment
export const createBrandPaymentMethodSetupIntent = () =>
  base44Client.post<{ client_secret: string }>(
    `/brand/billing/payment-method/setup-intent`,
    {},
  );

// Get all payment methods
export const getBrandPaymentMethods = () =>
  base44Client.get<{
    payment_methods: Array<{...}>;
    primary_payment_method: {...} | null;
  }>(`/brand/billing/payment-methods`);

// Set primary payment method
export const setBrandPrimaryPaymentMethod = (data: {
  stripe_payment_method_id: string;
}) =>
  base44Client.post(`/brand/billing/payment-method/set-primary`, data);

// Delete payment method
export const deleteBrandPaymentMethod = (data: {
  stripe_payment_method_id: string;
}) =>
  base44Client.post(`/brand/billing/payment-method/delete`, data);
```

## Security Considerations

1. **PCI Compliance**: Card data is never stored on our servers. Stripe handles all sensitive payment information.

2. **Row-Level Security (RLS)**: Database policies ensure brands can only access their own payment methods:
   - Brands can view their own payment methods
   - Brands can insert their own payment methods
   - Brands can update their own payment methods
   - Brands can delete their own payment methods

3. **Authentication**: All endpoints require authentication via `AuthUser` middleware.

4. **Soft Deletes**: Payment methods are soft-deleted (marked with `deleted_at` timestamp) to maintain audit trails.

5. **Stripe Integration**: Uses Stripe's SetupIntent API for secure, PCI-compliant payment method attachment.

## Usage Flow

### Adding a Payment Method

1. User clicks "Add Card" button in Billing & Payment settings
2. Modal opens with Stripe CardElement
3. User enters card details
4. Frontend creates SetupIntent via backend
5. Stripe confirms card setup
6. Backend stores payment method metadata in database
7. Card is set as primary payment method
8. Success message displayed

### Managing Payment Methods

1. User views list of saved payment methods
2. Each card shows:
   - Card brand and last 4 digits
   - Expiration date
   - Primary indicator (if applicable)
   - Delete button
3. User can delete cards (soft delete)
4. User can set a card as primary

## Database Migrations

Migration file: `supabase/migrations/2026-04-21_brand_payment_methods.sql`

This migration:
- Adds payment method columns to `brands` table
- Creates `brand_payment_methods` table
- Sets up indexes for performance
- Enables RLS with appropriate policies

## Integration with Billing System

The payment methods are designed to integrate with the existing billing system:

1. **Subscription Payments**: Primary payment method is used for subscription charges
2. **Add-on Purchases**: Used for studio add-on and other purchases
3. **Billing Portal**: Stripe billing portal can manage payment methods
4. **Invoices**: Payment method info is included in invoice records

## Error Handling

The implementation includes comprehensive error handling:

- **Setup Intent Creation Failures**: User-friendly error messages
- **Card Validation Errors**: Stripe validation messages displayed
- **Network Errors**: Retry logic and error notifications
- **Authorization Errors**: Proper 401/403 responses
- **Not Found Errors**: 404 when payment method doesn't exist

## Future Enhancements

1. **Automatic Retry Logic**: Implement retry logic for failed payments
2. **Payment Method Expiration Alerts**: Notify brands when cards are expiring
3. **Backup Payment Methods**: Allow multiple primary methods with fallback
4. **Payment History**: Display payment history per card
5. **Webhook Integration**: Handle Stripe events (card expiration, etc.)
6. **3D Secure**: Support for 3D Secure authentication
7. **ACH Transfers**: Support for bank account transfers

## Testing

### Manual Testing Checklist

- [ ] Add a test card (4242 4242 4242 4242)
- [ ] Verify card appears in payment methods list
- [ ] Set card as primary payment method
- [ ] Add another test card
- [ ] Switch between primary payment methods
- [ ] Delete a payment method
- [ ] Verify soft delete (check database)
- [ ] Test error scenarios (invalid card, network errors)
- [ ] Verify RLS policies (can't access other brands' cards)

### Test Cards

Use these Stripe test cards:
- **Visa**: 4242 4242 4242 4242
- **Mastercard**: 5555 5555 5555 4444
- **Amex**: 3782 822463 10005
- **Declined**: 4000 0000 0000 0002

## Deployment Notes

1. Run database migration before deploying backend
2. Ensure Stripe API keys are configured in environment
3. Update frontend environment variables with Stripe publishable key
4. Test payment method flow in staging before production
5. Monitor Stripe webhook logs for any issues

## Support

For issues or questions:
1. Check Stripe dashboard for payment method status
2. Review application logs for error details
3. Verify RLS policies are correctly applied
4. Check that Stripe API keys are valid and have correct permissions
