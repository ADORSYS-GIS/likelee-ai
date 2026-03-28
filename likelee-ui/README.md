# Base44 App

This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

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

### UI State After Signature

- The contract row becomes `active` in `agency_creator_marketplace_contracts`.
- The creator invite is no longer treated as a pending review item.
- The creator should appear under connected agencies in Creator Dashboard and Talent Portal.
- The agency marketplace card and agency roster should switch from `Waiting` to `Connected`.
- The underlying connection source of truth is the `agency_talent_relationships` row created or activated after contract completion.

For more information and support, please contact Base44 support at app@base44.com.
