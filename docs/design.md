# Likelee-AI – Global Design

Version: 0.1 (draft)

Owner: Shanel Pouatcha

---

## 1. Vision

Likelee AI builds the world’s first AI-creation ecosystem keeping humans at the center. It transforms faces (likeness) into monetizable assets while protecting consent, identity, and attribution.

## 2. Personas and Goals

| Persona              | Goal                                                                                                            | Core Value                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Faces (Talents)      | License their likeness, get discovered, earn royalties.                                                          | Turn face into an asset; visibility, royalties, usage tracking.                        |
| Brands & Studios     | Find approved likenesses, generate ethical content, manage contracts.                                            | Verified pool of talents/creators; one interface for discovery → creation → licensing. |
| AI Creators          | Collaborate, access paid opportunities, showcase portfolios, license faces for creative work.                    | Gigs, licensed usage, portfolio.                                                       |

## 3. Key User Flows

- Creator core flow (P1):
  1. Discover Faces with filters.
  2. Add Face to project basket; checkout via Stripe.
  3. Obtain short-term likeness license; generate in Likelee Studio via Model Router and Simple Prompt UI.
  4. Collaborate via simple chat thread.
- Agency onboarding (P0 for MRR):
  1. KYC (owner) → “Create Agency”.
  2. Purchase seats in blocks of 50 via Stripe ($35/seat/month).
  3. Import talents (CSV/drag-and-drop) to trigger invites.
  4. Seat activates when Face accepts terms.

## 4. Architecture Overview

- Web SPA (likelee-ui): React + TypeScript + Vite + Tailwind.
- Backend/Data: Firebase Realtime Database, Firebase Authentication, Firebase Storage.
- Core services (logical):
  - Royalty Ledger: record bookings and expose reads for dashboards.
  - Watermark API: apply invisible watermark to exports; hash tied to booking ID.
  - Payments (Stripe Connect): split payments Brand → Platform → Face + Creator; Stripe Express payouts.
  - Likelee Studio: Model Router (Replicate/HF/Together) + Simple Prompt UI.
  - i18n: Default EN; ES and FR prioritized for MVP.
  - Authentication/Authorization: Keycloak (OIDC/OAuth2) for identities, realms/clients/roles.

## 5. Tech Stack

- Frontend: React 18.2.0, TypeScript, Vite 6.5, Tailwind CSS 3.4.16.
- Backend: Firebase (Auth, Realtime DB, Storage). Future: functions/services as needed.
 

## 6. External Integrations

| Capability                 | Provider/Tech                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Payments & Billing         | Stripe Connect, Stripe Checkout                                                       |
| AI Generation/Rendering    | Replicate API, Hugging Face APIs, Together.ai                                         |
| Storage & Database         | Firebase Realtime Database, Firebase Storage                                          |
| Asset Traceability         | Truepic Lens (invisible watermarking)                                                 |
| Moderation                 | AWS Rekognition                                                                       |
| Royalty Tracking (P2)      | Meta Ads, TikTok Ads, Google Ads, Shopify Admin, Stripe (read-only)                   |

## 7. Data Model (Conceptual)

- Core entities: Face, Creator, Brand/Agency, Project, Booking, License, Asset, Experience, Session.
- Separation of concerns:
  - PII vs content data stored separately where feasible.
  - Booking → Ledger entry (immutable) with references to payments, C2PA/watermark hash.
- Consent:
  - Explicit consent steps for uploading face photos and licensing terms.

## 8. Security, Compliance, and Ethics

- Verification: KYC + liveness for Faces and before agency creation.
- Privacy-first: consented uploads, minimization, encryption in transit/at rest, DSRs.
- Trust & Traceability: invisible watermarking; C2PA manifest (P2) for attribution.
- AuthN/AuthZ: Keycloak (OIDC/OAuth2); roles for Faces, Creators, Brands, Admins.
- Moderation: automated image checks (Rekognition) + policy guardrails.

## 9. Monetization Model

| Model          | Description                                        | Tracking/Attribution                                                     | Priority |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| Flat Fee       | Fixed price per time unit set by Face.             | Royalty Ledger entry at booking payment.                                  | P0/P1    |
| Spend-Share    | % of real ad spend earned by Face.                 | OAuth to ad APIs; nightly retrieval of cost metrics.                      | Phase 2  |
| Revenue-Share  | % of sales earned by Face.                         | UTM or Face-specific coupons + Shopify/Stripe data.                       | Phase 2  |

Royalty model analogy: a digital bank ledger. Instead of a one-time sale, earnings flow from brand spend/revenue. C2PA acts like a serial number on a banknote to keep flows attributable to the face’s owner.

## 10. Non-Functional Requirements (NFRs)

- Performance: P95 interaction latency < TODO ms for key journeys.
- Availability: 99.9% monthly for public experiences.
- Security: No critical vulns; SOC2-ready controls (TBD).
- Accessibility: WCAG 2.1 AA baseline; responsive.
- Internationalization: EN; ES/FR prioritized.

## 11. Deployment & Operations

- Environments: Dev, Staging, Prod (TBD confirmation).
- Hosting: Firebase-backed MVP; future containerized services or Functions as needed.
- CI/CD: Lint, tests, build; deploy via pipeline (TBD tooling).
- Observability: Centralized logs/metrics/traces; alerts on SLOs.
- CDN: For static assets and AI outputs as appropriate.

## 12. Roadmap (Phases)

- P0: Agency onboarding (KYC, seats purchase, import/invites, activation).
- P1: Creator core flow, Stripe bookings, Royalty Ledger, Watermark API, Model Router + Prompt UI, i18n EN.
- P2: Spend-/Revenue-Share tracking (Ads/Shopify integrations), C2PA manifests, extended locales (ES/FR), enhanced moderation.

---

Appendix: Add Context/Container/Component/Deployment diagrams. Link ADRs for IdP, Stripe model, watermarking/C2PA, model routing providers.

    