# API Reference — likelee-server

## Overview

- **Base URL:** Configurable via `PORT` (default: `http://localhost:8787`)
- **Versioning:** None (URL paths are stable)
- **Content-Type:** `application/json`
- **Character Encoding:** UTF-8
- **Request Body Limit:** 20MB

## Authentication

All authenticated endpoints require a JWT token from Supabase Auth.

| Method | Header | Format |
|--------|--------|--------|
| Bearer Token | `Authorization` | `Bearer <supabase-jwt>` |

### Obtaining a Token
Tokens are obtained via Supabase Auth (client-side login). The backend validates tokens using `SUPABASE_JWT_SECRET`.

## Endpoints by Domain

### Talent Portal

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/talent/me` | Get talent profile |
| POST | `/api/talent/profile` | Update profile |
| GET | `/api/talent/settings` | Get portal settings |
| POST | `/api/talent/settings` | Update settings |
| GET | `/api/talent/licensing-requests` | List pending license requests |
| POST | `/api/talent/licensing-requests/:id/approve` | Approve license |
| POST | `/api/talent/licensing-requests/:id/decline` | Decline license |
| GET | `/api/talent/licenses` | List active licenses |
| GET | `/api/talent/licensing/revenue` | Revenue summary |
| GET | `/api/talent/bookings` | List bookings |
| GET | `/api/talent/book-outs` | List book-outs |
| POST | `/api/talent/book-outs` | Create book-out |
| DELETE | `/api/talent/book-outs/:id` | Delete book-out |
| GET | `/api/talent/payouts/account-status` | Stripe Connect status |
| POST | `/api/talent/payouts/onboarding-link` | Get onboarding link |
| GET | `/api/talent/payouts/balance` | Available balance |
| POST | `/api/talent/payouts/request` | Request payout |

### Agency Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agency/talent-invites` | List talent invites |
| POST | `/api/agency/talent-invites` | Create invite |
| POST | `/api/agency/talent-invites/:id/revoke` | Revoke invite |
| GET | `/api/agency/invoices` | List invoices |
| POST | `/api/agency/invoices` | Create invoice |
| GET | `/api/agency/invoices/:id` | Get invoice details |
| PUT | `/api/agency/invoices/:id` | Update invoice |
| DELETE | `/api/agency/invoices/:id` | Delete invoice |
| POST | `/api/agency/invoices/:id/send` | Send invoice via email |
| POST | `/api/agency/invoices/:id/mark-paid` | Mark as paid |
| GET | `/api/agency/payouts` | List payouts |
| POST | `/api/agency/payouts` | Create payout |
| GET | `/api/agency/payouts/account-status` | Stripe Connect status |
| POST | `/api/agency/payouts/onboarding-link` | Get onboarding link |

### Studio (AI Generation)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/studio/generate` | Submit generation job |
| GET | `/api/studio/jobs/:id` | Get job status |
| GET | `/api/studio/wallet` | Get wallet balance |
| GET | `/api/studio/generations` | List generations |
| GET | `/api/studio/transactions` | List credit transactions |
| GET | `/api/studio/presets` | List style presets |
| POST | `/api/studio/upload` | Upload reference file |
| GET | `/api/studio/licensed-assets` | List licensed assets |

### Brand Portal

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/brand/campaigns` | Create campaign |
| GET | `/api/brand/campaigns` | List campaigns |
| GET | `/api/brand/campaigns/:id` | Get campaign |
| POST | `/api/brand/campaigns/:id/offers` | Create offers |
| GET | `/api/campaign-offers/my` | List my offers |
| POST | `/api/campaign-offers/:id/respond` | Accept/decline offer |

### Marketplace

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/marketplace/search` | Search profiles |
| GET | `/api/marketplace/:type/:id/details` | Get profile details |
| POST | `/api/marketplace/connect` | Create draft marketplace contract and DocuSeal template for a creator connection |
| POST | `/api/marketplace/contracts/:id/finalize` | Finalize embedded DocuSeal builder work and send the marketplace contract for signature |

### KYC

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/kyc/session` | Create Veriff session |
| GET | `/api/kyc/status` | Get KYC status |

### Voice

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/voice/recordings` | List recordings |
| POST | `/api/voice/recordings` | Upload recording |
| DELETE | `/api/voice/recordings/:id` | Delete recording |

### Liveness

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/liveness/session` | Create liveness session |
| POST | `/api/liveness/result` | Get liveness result |

### Billing

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stripe/create-checkout-session` | Create Stripe checkout |
| POST | `/api/agency/billing/checkout` | Agency subscription checkout |

## Webhooks

| Path | Service | Purpose |
|------|---------|---------|
| POST | `/webhooks/stripe` | Stripe events (checkout, payouts) |
| POST | `/webhooks/kyc/veriff` | Veriff verification results |
| POST | `/webhooks/calendly` | Calendly booking events |
| POST | `/webhooks/docuseal` | DocuSeal webhook for scouting offers |
| POST | `/webhooks/docuseal/campaign-contracts` | DocuSeal webhook for campaign offer contracts |
| POST | `/api/webhooks/licenseContract` | DocuSeal webhook for licensing contracts |
| POST | `/webhooks/docuseal/marketplace-contracts` | DocuSeal webhook for agency marketplace creator contracts |

### Marketplace Contract Connection State

- `agency_creator_marketplace_contracts` tracks the legal contract workflow.
- `creator_agency_invites` tracks creator-facing invite state.
- `agency_talent_relationships` is the final connected/not-connected source of truth for marketplace creator connections after signature.
- After a successful marketplace contract completion event, the backend activates the relationship by updating:
  - the marketplace contract row to `active`
  - the invite row to `accepted`
  - the agency talent relationship row to `active`
  - the associated `agency_users` talent row to `active`

### Performance Tier Commission Precedence

- `GET /api/agency/dashboard/performance-tiers` now returns commission-source metadata for each creator row.
- Effective rate precedence is:
  1. Active marketplace contract commission from `agency_creator_marketplace_contracts`
  2. Agency settings override from `agency_creator_commissions`
  3. Tier default commission
- `POST /api/agency/dashboard/talent-commissions/bulk-update` rejects updates for creators whose rate is controlled by an active marketplace contract.

## Error Codes

| HTTP Status | Description | Common Cause |
|-------------|-------------|--------------|
| 400 | Bad Request | Invalid JSON, missing required field |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists |
| 402 | Payment Required | Insufficient credits (Studio) |
| 413 | Payload Too Large | File exceeds 20MB limit |
| 500 | Internal Error | Server-side error |

### Error Response Format

Plain text error message:
```
Failed to check balance: database connection error
```

Or JSON for structured errors:
```json
{
  "error": "Insufficient credits. Required: 500, please purchase more credits."
}
```

## Pagination

Most list endpoints support query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Max items to return |
| `offset` | integer | 0 | Skip N items |

## Rate Limiting

No server-side rate limiting implemented. Rate limits are enforced by:
- Supabase (database queries)
- Stripe (API calls)
- External providers (Fal, Veriff, etc.)
