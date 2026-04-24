# API Reference — likelee-server

## Overview

- **Base URL:** Configurable via `PORT` (default: `http://localhost:8787`)
- **Versioning:** None (URL paths are stable)
- **Content-Type:** `application/json`
- **Character Encoding:** UTF-8
- **Request Body Limit:** 20MB

## Authentication

All authenticated endpoints require a JWT token from Supabase Auth.

| Method       | Header          | Format                  |
| ------------ | --------------- | ----------------------- |
| Bearer Token | `Authorization` | `Bearer <supabase-jwt>` |

### Obtaining a Token

Tokens are obtained via Supabase Auth (client-side login). The backend validates tokens using `SUPABASE_JWT_SECRET`.

## Endpoints by Domain

### Talent Portal

| Method | Path                                         | Description                                       |
| ------ | -------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/talent/me`                             | Get talent profile                                |
| POST   | `/api/talent/profile`                        | Update profile                                    |
| GET    | `/api/talent/settings`                       | Get portal settings                               |
| POST   | `/api/talent/settings`                       | Update settings                                   |
| GET    | `/api/talent/licensing-requests`             | List pending license requests                     |
| POST   | `/api/talent/licensing-requests/:id/approve` | Approve license                                   |
| POST   | `/api/talent/licensing-requests/:id/decline` | Decline license                                   |
| GET    | `/api/talent/licenses`                       | List active licenses                              |
| GET    | `/api/talent/licensing/revenue`              | Revenue summary                                   |
| GET    | `/api/talent/bookings`                       | List bookings                                     |
| GET    | `/api/talent/book-outs`                      | List book-outs                                    |
| POST   | `/api/talent/book-outs`                      | Create book-out                                   |
| DELETE | `/api/talent/book-outs/:id`                  | Delete book-out                                   |
| GET    | `/api/talent/payouts/account-status`         | Stripe Connect status                             |
| POST   | `/api/talent/payouts/onboarding-link`        | Get onboarding link                               |
| GET    | `/api/talent/payouts/balance`                | Available balance                                 |
| POST   | `/api/talent/payouts/request`                | Request payout                                    |
| GET    | `/api/talent/analytics`                      | Creator analytics with plan-aware advanced fields |

### Agency Dashboard

| Method | Path                                    | Description            |
| ------ | --------------------------------------- | ---------------------- |
| GET    | `/api/agency/talent-invites`            | List talent invites    |
| POST   | `/api/agency/talent-invites`            | Create invite          |
| POST   | `/api/agency/talent-invites/:id/revoke` | Revoke invite          |
| GET    | `/api/agency/invoices`                  | List invoices          |
| POST   | `/api/agency/invoices`                  | Create invoice         |
| GET    | `/api/agency/invoices/:id`              | Get invoice details    |
| PUT    | `/api/agency/invoices/:id`              | Update invoice         |
| DELETE | `/api/agency/invoices/:id`              | Delete invoice         |
| POST   | `/api/agency/invoices/:id/send`         | Send invoice via email |
| POST   | `/api/agency/invoices/:id/mark-paid`    | Mark as paid           |
| GET    | `/api/agency/payouts`                   | List payouts           |
| POST   | `/api/agency/payouts`                   | Create payout          |
| GET    | `/api/agency/payouts/account-status`    | Stripe Connect status  |
| POST   | `/api/agency/payouts/onboarding-link`   | Get onboarding link    |

### Campaign Offer Transfers (Agency)

These endpoints are agency-only and require the `manage_billing` permission. They are only meaningful after `escrow_status = "released"` (i.e. after the brand has approved at least one deliverable).

| Method | Path                                                        | Description                                                                 |
| ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/agency/campaign-offers/:offer_id/transfer-status`     | Live Stripe account health + transfer row status for every recipient        |
| POST   | `/api/agency/campaign-offers/:offer_id/retry-transfers`     | Retry all failed Stripe transfers for an offer                              |

#### Transfer Status Response Fields (per recipient)

| Field                    | Type    | Description                                                        |
| ------------------------ | ------- | ------------------------------------------------------------------ |
| `recipient_type`         | string  | `"agency"` or `"creator"`                                          |
| `recipient_id`           | string  | UUID of the recipient                                              |
| `name`                   | string  | Display name                                                       |
| `amount_cents`           | integer | Amount owed in cents                                               |
| `transfer_status`        | string  | `created` / `failed` / `pending_retry` / `reversed` / `not_attempted` |
| `failure_reason`         | string? | Raw Stripe failure reason (if failed)                              |
| `retry_count`            | integer | Number of retry attempts made                                      |
| `stripe_connected`       | boolean | Whether a Stripe Connect account exists                            |
| `stripe_transfers_enabled` | boolean | Whether the `transfers` capability is active on the account      |
| `stripe_payouts_enabled` | boolean | Whether payouts are enabled on the account                         |
| `stripe_details_submitted` | boolean | Whether Stripe onboarding details have been submitted            |

#### Retry Response Fields (per retried recipient)

| Field               | Type    | Description                                                  |
| ------------------- | ------- | ------------------------------------------------------------ |
| `result`            | string  | `succeeded` / `failed` / `skipped_no_account`                |
| `failure_reason`    | string? | Reason if failed                                             |
| `stripe_transfer_id`| string? | Stripe transfer ID if succeeded                              |

#### Retry Error Codes

| Code                  | HTTP | Meaning                                              |
| --------------------- | ---- | ---------------------------------------------------- |
| `escrow_not_released` | 400  | Brand has not approved yet — retry not allowed       |
| `offer_not_paid`      | 400  | Offer payment not completed                          |
| `offer_not_found`     | 404  | Offer does not belong to this agency                 |

### Studio (AI Generation)

| Method | Path                          | Description              |
| ------ | ----------------------------- | ------------------------ |
| POST   | `/api/studio/generate`        | Submit generation job    |
| GET    | `/api/studio/jobs/:id`        | Get job status           |
| GET    | `/api/studio/wallet`          | Get wallet balance       |
| GET    | `/api/studio/generations`     | List generations         |
| GET    | `/api/studio/transactions`    | List credit transactions |
| GET    | `/api/studio/presets`         | List style presets       |
| POST   | `/api/studio/upload`          | Upload reference file    |
| GET    | `/api/studio/licensed-assets` | List licensed assets     |

### Brand Portal

| Method | Path                               | Description          |
| ------ | ---------------------------------- | -------------------- |
| POST   | `/api/brand/campaigns`             | Create campaign      |
| GET    | `/api/brand/campaigns`             | List campaigns       |
| GET    | `/api/brand/campaigns/:id`         | Get campaign         |
| POST   | `/api/brand/campaigns/:id/offers`  | Create offers        |
| GET    | `/api/campaign-offers/my`          | List my offers       |
| POST   | `/api/campaign-offers/:id/respond` | Accept/decline offer |

### Marketplace

| Method | Path                                      | Description                                                                             |
| ------ | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/api/marketplace/search`                 | Search profiles                                                                         |
| GET    | `/api/marketplace/:type/:id/details`      | Get profile details                                                                     |
| POST   | `/api/marketplace/connect`                | Create draft marketplace contract and DocuSeal template for a creator connection        |
| POST   | `/api/marketplace/contracts/:id/finalize` | Finalize embedded DocuSeal builder work and send the marketplace contract for signature |

### KYC

| Method | Path               | Description           |
| ------ | ------------------ | --------------------- |
| POST   | `/api/kyc/session` | Create Veriff session |
| GET    | `/api/kyc/status`  | Get KYC status        |

### Voice

| Method | Path                        | Description      |
| ------ | --------------------------- | ---------------- |
| GET    | `/api/voice/recordings`     | List recordings  |
| POST   | `/api/voice/recordings`     | Upload recording |
| DELETE | `/api/voice/recordings/:id` | Delete recording |

### Liveness

| Method | Path                    | Description             |
| ------ | ----------------------- | ----------------------- |
| POST   | `/api/liveness/session` | Create liveness session |
| POST   | `/api/liveness/result`  | Get liveness result     |

### Billing

| Method | Path                                  | Description                            |
| ------ | ------------------------------------- | -------------------------------------- |
| POST   | `/api/stripe/create-checkout-session` | Create Stripe checkout                 |
| POST   | `/api/agency/billing/checkout`        | Agency subscription checkout           |
| POST   | `/api/creator/billing/checkout`       | Creator subscription checkout          |
| GET    | `/api/creator/billing/status`         | Creator billing state and entitlements |

## Webhooks

| Path | Service                                    | Purpose                                                   |
| ---- | ------------------------------------------ | --------------------------------------------------------- |
| POST | `/webhooks/stripe`                         | Stripe events (checkout, payouts)                         |
| POST | `/webhooks/kyc/veriff`                     | Veriff verification results                               |
| POST | `/webhooks/calendly`                       | Calendly booking events                                   |
| POST | `/webhooks/docuseal`                       | DocuSeal webhook for scouting offers                      |
| POST | `/webhooks/docuseal/campaign-contracts`    | DocuSeal webhook for campaign offer contracts             |
| POST | `/api/webhooks/licenseContract`            | DocuSeal webhook for licensing contracts                  |
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

### Marketplace Contract Disconnect Workflow

- `POST /api/creator/agency-connections/:agency_id/disconnect`
  - immediate disconnect only when no active marketplace contract controls the relationship
  - otherwise records a creator disconnect request on the marketplace contract row
- `POST /api/agency/creator-connections/:creator_id/disconnect/approve`
  - approves a pending creator disconnect request
  - marks the contract terminated and removes the live agency-creator relationship
- `POST /api/agency/creator-connections/:creator_id/disconnect/reject`
  - rejects a pending creator disconnect request while keeping the live relationship active
- `GET /api/agency/creator-connections/:creator_id/contract`
  - returns the latest marketplace contract summary for agency review UI
- Active marketplace contracts retain their legal row for history even after the live `agency_talent_relationships` row is removed.
- Contract expiry also removes the live relationship automatically.

### Performance Tier Commission Precedence

- `GET /api/agency/dashboard/performance-tiers` now returns commission-source metadata for each creator row.
- Effective rate precedence is:
  1. Active marketplace contract commission from `agency_creator_marketplace_contracts`
  2. Agency settings override from `agency_creator_commissions`
  3. Tier default commission
- `POST /api/agency/dashboard/talent-commissions/bulk-update` rejects updates for creators whose rate is controlled by an active marketplace contract.

## Error Codes

| HTTP Status | Description       | Common Cause                           |
| ----------- | ----------------- | -------------------------------------- |
| 400         | Bad Request       | Invalid JSON, missing required field   |
| 401         | Unauthorized      | Missing or invalid JWT                 |
| 403         | Forbidden         | Valid JWT but insufficient permissions |
| 404         | Not Found         | Resource does not exist                |
| 409         | Conflict          | Resource already exists                |
| 402         | Payment Required  | Insufficient credits (Studio)          |
| 413         | Payload Too Large | File exceeds 20MB limit                |
| 500         | Internal Error    | Server-side error                      |

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

| Parameter | Type    | Default | Description         |
| --------- | ------- | ------- | ------------------- |
| `limit`   | integer | 20      | Max items to return |
| `offset`  | integer | 0       | Skip N items        |

## Rate Limiting

No server-side rate limiting implemented. Rate limits are enforced by:

- Supabase (database queries)
- Stripe (API calls)
- External providers (Fal, Veriff, etc.)

## Creator Billing Notes

- Creator plan source of truth lives on `public.creators.plan_tier`.
- Supported values are `free`, `basic`, and `pro`.
- `GET /api/creator/billing/status` returns entitlement metadata used by the creator dashboard and talent portal:
  - `category_limit`
  - `can_use_cameo_uploads`
  - `can_use_unauthorized_monitoring`
  - `can_use_voice_profiles`
  - `voice_tone_limit`
  - `can_use_advanced_analytics`
- Voice creation and Cameo uploads are enforced server-side; UI gating is only a convenience layer.
