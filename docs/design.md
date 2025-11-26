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
- Backend: Firebase (Auth, Realtime DB, Storage). Future: functions/services as needed, Rust axum framework.

## 6. External Integrations

| Capability                 | Provider/Tech                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Payments & Billing         | Stripe Connect, Stripe Checkout                                                       |
| AI Generation/Rendering    | Replicate API, Hugging Face APIs, Together.ai                                         |
| Storage & Database         | Firebase Realtime Database, Firebase Storage                                          |
| Asset Traceability         | Truepic Lens (invisible watermarking)                                                 |
| Moderation & Liveness     | AWS Rekognition (Moderation, Face Liveness)                                           |
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

## 13. Configuration Management

- Runtime configuration is centralized via the Rust `envconfig` crate.
- Service reads configuration from environment variables (with dotenv support in dev).
- Single source of truth struct: `ServerConfig` (`likelee-server/src/config.rs`).

### Environment Variables (Backend – likelee-server)
- SUPABASE_URL (required)
- SUPABASE_SERVICE_KEY (required)
- PORT (default: 8787)
- VERIFF_BASE_URL (required)
- VERIFF_API_KEY (required)
- VERIFF_SHARED_SECRET (required)
- DUIX_BASE_URL (default: http://127.0.0.1:7860)
- DUIX_AUTH_TOKEN (default: change-me)
- MODERATION_ENABLED (default: "1", set to "0" to disable Rekognition image moderation)
- AWS_REGION (default: us-east-1)
- LIVENESS_ENABLED (default: "0"; set to "1" to enable Face Liveness endpoints)
- LIVENESS_MIN_SCORE (default: 0.90)
- COGNITO_IDENTITY_POOL_ID (required when LIVENESS_ENABLED=1)

Notes:
- All runtime config is read only via `ServerConfig` (envconfig). Do NOT call `std::env::var` in application code.
- Keep `likelee-server/.env.example` in sync with these variables and defaults.

### Environment Variables (Frontend – likelee-ui)
- VITE_API_BASE_URL – e.g. http://localhost:8787
- VITE_AWS_REGION – must be a valid AWS region (e.g., us-east-1, eu-west-1)
- VITE_COGNITO_IDENTITY_POOL_ID – e.g., us-east-1:xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx

### Rekognition Face Liveness – Region Alignment
- Face Liveness is available only in specific regions. Use a supported region (e.g., us-east-1 or eu-west-1).
- The following must MATCH the same region:
  - Backend `AWS_REGION`
  - Frontend `VITE_AWS_REGION`
  - Cognito Identity Pool region
- Invalid regions (e.g., `eu-east-1`) or mismatched regions will cause DNS errors or AccessDenied.

### IAM Requirements
- Server IAM principal (keys used by likelee-server):
  - `rekognition:CreateFaceLivenessSession`
  - `rekognition:GetFaceLivenessSessionResults`
- Browser (Cognito Identity Pool role used by the web app):
  - `rekognition:StartFaceLivenessSession`
- Cognito Role Trust Policy must restrict to your Identity Pool and amr:
  - `"cognito-identity.amazonaws.com:aud": "<IDENTITY_POOL_ID>"`
  - `"ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "unauthenticated" }` (or `authenticated` if using auth role)
- Ensure the Rekognition service-linked role exists (AWSServiceRoleForRekognition) or allow `iam:CreateServiceLinkedRole`.

### Frontend Integration Notes (Amplify UI Face Liveness)
- Use `@aws-amplify/ui-react-liveness` FaceLivenessDetector component.
- Import styles in `src/main.tsx`:
  - `@aws-amplify/ui-react/styles.css`
  - `@aws-amplify/ui-react-liveness/styles.css`
- Provide a credentials provider from Cognito Identity Pool at runtime.
- Open the detector in a portal-based modal to avoid stacking/overflow issues.

### Operational Guidance
- If session creation succeeds but UI stays pending: verify CloudTrail for `StartFaceLivenessSession` in the selected region.
- If no event appears: fix Cognito role trust/policy or region mismatch; ensure camera/mic are allowed.

---

Appendix: Add Context/Container/Component/Deployment diagrams. Link ADRs for IdP, Stripe model, watermarking/C2PA, model routing providers.
