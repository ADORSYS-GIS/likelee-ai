# Likelee UI

Vite + React frontend for the Likelee platform.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Creator Subscription Tiers

The creator dashboard and talent portal are now plan-aware.

### Supported plans

- `Free`: fallback state for creators without an active paid subscription
- `Basic`: core creator workflow with likeness profile, KYC, agency connection, and up to 15 combined categories
- `Pro`: unlocks Cameo uploads, unauthorized-use monitoring access, ElevenLabs voice profile creation, and advanced analytics

### UI behavior

- non-Pro creators see upgrade prompts instead of dead-end actions
- voice profile creation routes to the creator subscription screen when locked
- analytics and monitoring surfaces expose Pro upgrade cards for Basic and Free creators
- creator billing is managed from `/CreatorSubscribe` and surfaced in dashboard settings

## Marketplace Contract Connect Flow

The agency dashboard marketplace `Connect` action for creator profiles now opens a contract-first workflow.

- Agencies must first enter critical terms in a modal:
  - commission rate
  - valid from date
  - valid until date
- The contract body remains editable, but it must contain the required placeholders:
  - `{agency_name}`
  - `{creator_name}`
  - `{commission_rate}`
  - `{valid_from}`
  - `{valid_until}`
- The first submit action creates a draft marketplace contract and opens the embedded DocuSeal builder.
- The agency places signature fields in DocuSeal and then uses `Finalize & Send` to send the contract.
- Creators review/sign the contract from their invite experience in Creator Dashboard and Talent Portal via the `Review contract` action.
- After the creator signs, the DocuSeal marketplace webhook activates the connection automatically; the dashboards also do a best-effort sync on normal reads as a fallback.
- For marketplace-connected creators, payout commission now comes from the active signed contract instead of agency settings overrides.
- Creator-side connected agency cards now expose key contract details such as commission, start date, end date, and the signed document link.
- Creator-side disconnect for active marketplace contracts is now a request flow, not an instant removal.
- Agency roster talent panels can review marketplace contract details and approve or reject pending early disconnect requests.

### UI State After Signature

- The contract row becomes `active` in `agency_creator_marketplace_contracts`.
- The creator invite is no longer treated as a pending review item.
- The creator should appear under connected agencies in Creator Dashboard and Talent Portal.
- The agency marketplace card and agency roster should switch from `Waiting` to `Connected`.
- The underlying connection source of truth is the `agency_talent_relationships` row created or activated after contract completion.

### Disconnect Rules

- Active marketplace contracts require agency approval before a creator can disconnect early.
- Expired marketplace contracts automatically remove the live agency-creator connection.
- The legal contract row is preserved for history even after the live relationship is removed.

For more information and support, please contact Base44 support at app@base44.com.
