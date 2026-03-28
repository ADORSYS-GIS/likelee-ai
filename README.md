# Likelee-AI

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
