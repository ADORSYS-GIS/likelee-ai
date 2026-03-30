# Likelee-AI

The AI creation ecosystem connecting Faces, AI Creators, and Brands.

## Creator Subscription Tiers

Creator billing now supports plan-aware entitlements backed by Stripe and persisted on `public.creators`.

### Plans

- `free`: safe fallback when no paid creator subscription is active
- `basic` (`$25/mo`): likeness profile, KYC, agency connection, and up to 15 combined `content_types` + `industries`
- `pro` (`$50/mo`): everything in Basic plus Cameo uploads, unauthorized-use monitoring access, ElevenLabs voice profile creation for up to 6 tones, and advanced earnings analytics

### Source Of Truth

- `public.creators.plan_tier`
- `public.creators.stripe_customer_id`
- `public.creators.stripe_subscription_id`
- `public.creators.plan_updated_at`

Audit history is stored in `public.creator_subscription_events`.

### Backend Enforcement

Creator entitlements are enforced server-side before UI gating:

- voice profile creation is Pro-only and capped at 6 tones
- creator analytics responses expose `plan_tier` and `advanced_analytics_enabled`
- Basic and Free creators are capped at 15 combined public categories
- Cameo uploads are blocked for non-Pro creators

### Creator Billing Endpoints

- `POST /api/creator/billing/checkout`
- `GET /api/creator/billing/status`

### Required Stripe Config

- `STRIPE_CREATOR_BASIC_PRICE_ID`
- `STRIPE_CREATOR_PRO_PRICE_ID`
- `STRIPE_CREATOR_SUCCESS_URL`
- `STRIPE_CREATOR_CANCEL_URL`
