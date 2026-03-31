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
The AI creation ecosystem connecting Faces, AI Creators, and Brands

## Marketplace Creator Connections

Agency-to-creator connections started from the agency dashboard marketplace are now contract-backed.

- The agency clicks `Connect` from the marketplace and must first provide locked contract terms such as `commission_rate`, `valid_from`, and `valid_until`.
- Those critical values are stored in the database before the contract is rendered.
- The rendered contract is pushed into an embedded DocuSeal builder so the agency can place the required signature fields before the contract is sent.
- The contract body can be customized, but it must include the required placeholders:
  - `{agency_name}`
  - `{creator_name}`
  - `{commission_rate}`
  - `{valid_from}`
  - `{valid_until}`
- Connected marketplace creators use the active signed contract commission for payout splits.
- Agency commission overrides in settings remain applicable only to agency-owned/internal talents.
- A marketplace connection becomes active only after contract signature.
- The DocuSeal webhook endpoint for this flow is `POST /webhooks/docuseal/marketplace-contracts`.
- When DocuSeal posts a completed signing event, the marketplace contract row is updated immediately and the creator-agency connection is activated automatically.
- The creator dashboard, talent portal, and agency roster also perform best-effort contract sync on normal reads as a fallback if webhook delivery is delayed.
- Active marketplace contracts cannot be disconnected instantly by the creator.
- Early creator disconnects now create a pending request that the agency must approve.
- If the marketplace contract expires, the live agency-creator connection is removed automatically while the contract record is retained for history.

### State Ownership

- `agency_creator_marketplace_contracts` stores the legal contract lifecycle:
  - `draft`
  - `pending_signature`
  - `active`
  - `expired`
  - `declined`
  - `voided`
- `creator_agency_invites` stores invite/request state for the creator dashboard experience.
- `agency_talent_relationships` is the real connection table that determines whether a creator is connected to an agency.
- `agency_users` is kept in sync so the creator appears correctly in the agency roster and related agency views.

### Activation Flow

- Agency starts marketplace `Connect`.
- A draft contract row is created in `agency_creator_marketplace_contracts`.
- A pending invite row is ensured in `creator_agency_invites`.
- The agency uses the embedded DocuSeal builder to place signature fields and send the contract.
- After both parties sign, the marketplace DocuSeal webhook updates the contract row to `active`.
- Activation then updates:
  - `creator_agency_invites.status -> accepted`
  - `agency_users.status -> active` for the agency/creator pair
  - `agency_talent_relationships.status -> active`
- Marketplace cards, Creator Dashboard, Talent Portal, and the Agency Roster should all treat the creator as connected once `agency_talent_relationships` is active.

### Disconnect Workflow

- Creator direct disconnect is blocked while a marketplace contract is still `active`.
- The creator may request disconnect early, which updates the contract row with:
  - `disconnect_status = pending`
  - `disconnect_requested_by = creator`
  - `disconnect_requested_at`
  - `disconnect_reason`
- The agency reviews that request and can approve or reject it.
- Approval updates the contract row to `terminated`, records review metadata, and removes the live `agency_talent_relationships` row.
- Rejection keeps the contract active and records the review metadata on the contract.
- On natural expiry, the live relationship is automatically removed and the contract is moved out of the active connection set.
