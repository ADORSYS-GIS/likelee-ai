# Brand Payment Methods - Flow Diagrams

## 1. Add Payment Method Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Brand Settings Page                          │
│                  (BrandSettingsBilling.tsx)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Click "Add Card"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Payment Method Modal                           │
│              (PaymentMethodModal.tsx)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Stripe CardElement                                      │  │
│  │  [Card Number] [MM/YY] [CVC]                            │  │
│  │  [Add Card Button]                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User enters card details
                              │ Clicks "Add Card"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                             │
│  1. Call createBrandPaymentMethodSetupIntent()                 │
│  2. Get client_secret from response                            │
│  3. Call stripe.confirmCardSetup()                             │
│  4. Get payment_method ID from response                        │
│  5. Call setBrandPrimaryPaymentMethod()                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                               │
│                                                                 │
│  POST /api/brand/billing/payment-method/setup-intent           │
│  ├─ Get or create Stripe customer                              │
│  ├─ Create SetupIntent with Stripe                             │
│  └─ Return client_secret                                       │
│                                                                 │
│  POST /api/brand/billing/payment-method/set-primary            │
│  ├─ Verify payment method exists                               │
│  ├─ Update brands table with payment method info               │
│  ├─ Insert into brand_payment_methods table                    │
│  └─ Return OK                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Database Updates
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                          │
│                                                                 │
│  brands table:                                                  │
│  ├─ stripe_payment_method_id = "pm_..."                        │
│  ├─ payment_method_last_four = "4242"                          │
│  ├─ payment_method_brand = "visa"                              │
│  ├─ payment_method_exp_month = 12                              │
│  ├─ payment_method_exp_year = 2025                             │
│  └─ payment_method_updated_at = NOW()                          │
│                                                                 │
│  brand_payment_methods table:                                  │
│  ├─ id = "uuid"                                                │
│  ├─ brand_id = "brand_uuid"                                    │
│  ├─ stripe_payment_method_id = "pm_..."                        │
│  ├─ card_last_four = "4242"                                    │
│  ├─ card_brand = "visa"                                        │
│  ├─ card_exp_month = 12                                        │
│  ├─ card_exp_year = 2025                                       │
│  ├─ is_active = true                                           │
│  └─ created_at = NOW()                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Success
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Success Message                              │
│              "Card added successfully!"                         │
│                                                                 │
│              Modal closes, list refreshes                       │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Get Payment Methods Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Brand Settings Page                          │
│                  (BrandSettingsBilling.tsx)                     │
│                                                                 │
│  useEffect(() => {                                              │
│    loadPaymentMethods()                                         │
│  }, [])                                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Component Mount
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                             │
│  Call getBrandPaymentMethods()                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP GET Request
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                               │
│  GET /api/brand/billing/payment-methods                         │
│  ├─ Get authenticated brand_id from AuthUser                   │
│  ├─ Query brand_payment_methods table                           │
│  │  WHERE brand_id = auth_user_id                              │
│  │  AND deleted_at IS NULL                                     │
│  ├─ Query brands table for primary payment method              │
│  └─ Return both in response                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ JSON Response
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Response Structure                           │
│  {                                                              │
│    "payment_methods": [                                         │
│      {                                                          │
│        "id": "uuid",                                            │
│        "stripe_payment_method_id": "pm_...",                   │
│        "card_last_four": "4242",                               │
│        "card_brand": "visa",                                   │
│        "card_exp_month": 12,                                   │
│        "card_exp_year": 2025,                                  │
│        "is_active": true,                                      │
│        "created_at": "2026-04-21T10:00:00Z"                   │
│      }                                                          │
│    ],                                                           │
│    "primary_payment_method": {                                 │
│      "stripe_payment_method_id": "pm_...",                     │
│      "card_last_four": "4242",                                 │
│      "card_brand": "visa",                                     │
│      "card_exp_month": 12,                                     │
│      "card_exp_year": 2025                                     │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Update State
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Render                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Payment Methods List                                    │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ 💳 VISA •••• •••• 4242 (12/2025)                  │  │  │
│  │  │ ✓ Primary Payment Method                           │  │  │
│  │  │                                          [Delete]  │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Delete Payment Method Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Methods List                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 💳 VISA •••• •••• 4242 (12/2025)                        │  │
│  │                                          [Delete] ◄─────┼──┤
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Click Delete
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                             │
│  Call deleteBrandPaymentMethod({                                │
│    stripe_payment_method_id: "pm_..."                           │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST Request
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                               │
│  POST /api/brand/billing/payment-method/delete                  │
│  ├─ Get authenticated brand_id from AuthUser                   │
│  ├─ Soft delete: UPDATE brand_payment_methods                  │
│  │  SET deleted_at = NOW()                                     │
│  │  WHERE stripe_payment_method_id = "pm_..."                  │
│  │  AND brand_id = auth_user_id                                │
│  └─ Return OK (200)                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Success
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Update                              │
│  ├─ Show success toast: "Payment method deleted"               │
│  ├─ Reload payment methods list                                │
│  └─ Remove card from UI                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Set Primary Payment Method Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Methods List                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 💳 VISA •••• •••• 4242 (12/2025)                        │  │
│  │ ✓ Primary Payment Method                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 💳 MASTERCARD •••• •••• 5555 (08/2026)                  │  │
│  │                                          [Set Primary]   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Click "Set Primary"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                             │
│  Call setBrandPrimaryPaymentMethod({                            │
│    stripe_payment_method_id: "pm_5555..."                       │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST Request
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Rust)                               │
│  POST /api/brand/billing/payment-method/set-primary             │
│  ├─ Get authenticated brand_id from AuthUser                   │
│  ├─ Verify payment method exists and belongs to brand          │
│  ├─ UPDATE brands table                                        │
│  │  SET stripe_payment_method_id = "pm_5555..."                │
│  │  SET payment_method_last_four = "5555"                      │
│  │  SET payment_method_brand = "mastercard"                    │
│  │  SET payment_method_exp_month = 8                           │
│  │  SET payment_method_exp_year = 2026                         │
│  │  SET payment_method_updated_at = NOW()                      │
│  │  WHERE id = auth_user_id                                    │
│  └─ Return OK (200)                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Success
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Update                              │
│  ├─ Show success toast: "Primary payment method updated"       │
│  ├─ Reload payment methods list                                │
│  └─ Update UI with new primary indicator                       │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  BrandSettingsBilling Component                           │ │
│  │  ├─ Displays payment methods list                         │ │
│  │  ├─ Shows "Add Card" button                               │ │
│  │  └─ Handles delete/set-primary actions                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  PaymentMethodModal Component                             │ │
│  │  ├─ Stripe CardElement for card input                     │ │
│  │  ├─ Handles card validation                               │ │
│  │  └─ Manages SetupIntent flow                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Backend Server                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Router (router.rs)                                       │ │
│  │  ├─ POST /api/brand/billing/payment-method/setup-intent   │ │
│  │  ├─ GET /api/brand/billing/payment-methods                │ │
│  │  ├─ POST /api/brand/billing/payment-method/set-primary    │ │
│  │  └─ POST /api/brand/billing/payment-method/delete         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Billing Module (billing.rs)                              │ │
│  │  ├─ create_brand_payment_method_setup_intent()            │ │
│  │  ├─ get_brand_payment_methods()                           │ │
│  │  ├─ set_brand_primary_payment_method()                    │ │
│  │  └─ delete_brand_payment_method()                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Database Queries
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Supabase Database                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  brands table                                              │ │
│  │  ├─ stripe_payment_method_id                              │ │
│  │  ├─ payment_method_last_four                              │ │
│  │  ├─ payment_method_brand                                  │ │
│  │  ├─ payment_method_exp_month                              │ │
│  │  ├─ payment_method_exp_year                               │ │
│  │  └─ payment_method_updated_at                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  brand_payment_methods table                               │ │
│  │  ├─ id (uuid)                                              │ │
│  │  ├─ brand_id (uuid)                                        │ │
│  │  ├─ stripe_payment_method_id                              │ │
│  │  ├─ card_last_four                                        │ │
│  │  ├─ card_brand                                            │ │
│  │  ├─ card_exp_month                                        │ │
│  │  ├─ card_exp_year                                         │ │
│  │  ├─ is_active                                             │ │
│  │  ├─ created_at                                            │ │
│  │  ├─ updated_at                                            │ │
│  │  └─ deleted_at (soft delete)                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Stripe API
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Stripe Services                             │
│  ├─ Create/Retrieve Customers                                   │
│  ├─ Create SetupIntents                                         │
│  ├─ Manage PaymentMethods                                       │
│  └─ Handle Card Validation                                      │
└──────────────────────────────────────────────────────────────────┘
```

## 6. Security & Access Control

```
┌──────────────────────────────────────────────────────────────────┐
│                    Authentication Layer                          │
│  ├─ AuthUser middleware extracts user_id from JWT               │
│  └─ All endpoints require valid authentication                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Authorization Layer                           │
│  ├─ Backend verifies brand_id matches authenticated user_id     │
│  └─ Only allows operations on own payment methods               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Database RLS Policies                         │
│  ├─ SELECT: brand_id = auth.uid()                               │
│  ├─ INSERT: brand_id = auth.uid()                               │
│  ├─ UPDATE: brand_id = auth.uid()                               │
│  └─ DELETE: brand_id = auth.uid()                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Data Protection                               │
│  ├─ Card data never stored locally (Stripe handles it)          │
│  ├─ Only last 4 digits stored in database                       │
│  ├─ Soft deletes maintain audit trail                           │
│  └─ All operations logged with timestamps                       │
└──────────────────────────────────────────────────────────────────┘
```

---

These diagrams illustrate the complete flow of the payment method management system from user interaction through database storage.
