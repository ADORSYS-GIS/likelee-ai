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
