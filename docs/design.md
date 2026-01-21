# Likelee-AI – Global Design

Voice assets and brand delivery (Supabase):

- `voice_recordings` (private bucket) store Face-owned audio samples, with `accessible` flag to control inclusion in licensed delivery.
- `voice_models` register cloned voice metadata per provider (e.g., ElevenLabs `provider_voice_id`).
- `brand_licenses` link `brand_org_id` (organization_profiles.id) ↔ `face_user_id` with status and validity window.
- `brand_voice_folders` and `brand_voice_assets` expose licensed voice assets under the Brand’s workspace without duplicating binaries.

Version: 0.1 (draft)

Owner: Shanel Pouatcha

---

## 1. Vision

Likelee AI builds the world’s first AI-creation ecosystem keeping humans at the center. It transforms faces (likeness) into monetizable assets while protecting consent, identity, and attribution.

## 2. Personas and Goals

| Persona          | Goal                                                                                          | Core Value                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Faces (Talents)  | License their likeness, get discovered, earn royalties.                                       | Turn face into an asset; visibility, royalties, usage tracking.                        |
| Brands & Studios | Find approved likenesses, generate ethical content, manage contracts.                         | Verified pool of talents/creators; one interface for discovery → creation → licensing. |
| AI Creators      | Collaborate, access paid opportunities, showcase portfolios, license faces for creative work. | Gigs, licensed usage, portfolio.                                                       |

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

### Voice & Recordings and License Activation (P1)

- Faces record/upload voice samples in their dashboard (private storage, consented).
- Optional: create an AI cloned voice model via ElevenLabs from approved samples.
- When a Brand’s likeness license is activated, Likelee provisions a Voice Folder in the Brand workspace and links:
  - All accessible voice recordings of the Face
  - Any ready cloned voice models (e.g., ElevenLabs)
- Brands consume recordings via signed URLs and models via provider IDs within Likelee Studio workflows.

## 4. Architecture Overview

- Web SPA (likelee-ui): React + TypeScript + Vite + Tailwind.
- Backend/Data: Supabase (Auth, Postgres, Storage) with service APIs (Rust axum server).
- Core services (logical):
  - Royalty Ledger: record bookings and expose reads for dashboards.
  - Watermark API: apply invisible watermark to exports; hash tied to booking ID.
  - Payments (Stripe Connect): split payments Brand → Platform → Face + Creator; Stripe Express payouts.
  - Likelee Studio: Model Router (Replicate/HF/Together) + Simple Prompt UI.
  - i18n: Default EN; ES and FR prioritized for MVP.
  - Authentication/Authorization: Keycloak (OIDC/OAuth2) for identities, realms/clients/roles.

## 5. Tech Stack

- Frontend: React 18.2.0, TypeScript, Vite 6.5, Tailwind CSS 3.4.16.
- Backend: Supabase (Auth, Postgres, Storage) + Rust axum server.

## 6. External Integrations

| Capability               | Provider/Tech                                                       |
| ------------------------ | ------------------------------------------------------------------- |
| Payments & Billing       | Stripe Connect, Stripe Checkout                                     |
| AI Generation/Rendering  | Replicate API, Hugging Face APIs, Together.ai                       |
| Voice Cloning (optional) | ElevenLabs                                                          |
| Storage & Database       | Supabase (Auth, Postgres, Storage)                                  |
| Asset Traceability       | Truepic Lens (invisible watermarking)                               |
| Moderation & Liveness    | AWS Rekognition (Moderation, Face Liveness)                         |
| Royalty Tracking (P2)    | Meta Ads, TikTok Ads, Google Ads, Shopify Admin, Stripe (read-only) |

## 7. Data Model (Conceptual)

- Core entities: Face, Creator, Brand/Agency, Project, Booking, License, Asset, Experience, Session.
- Separation of concerns:
  - PII vs content data stored separately where feasible.
  - Booking → Ledger entry (immutable) with references to payments, C2PA/watermark hash.
- Consent:
  - Explicit consent steps for uploading face photos and licensing terms.

Reference images storage model (Supabase):

- `reference_images` table stores creator reference images (including the three cameo angles). Columns include: user_id, section_id (e.g., headshot_neutral, headshot_smiling, etc.), storage_bucket, storage_path, public_url (if public), width, height, size_bytes, mime_type, sha256, moderation_status, moderation_reason, created_at, created_by, deleted_at.
- The three cameo images (front/left/right) are fully migrated into `reference_images` and no longer kept as separate columns on profiles for new writes. Legacy reads can be supported via a one-time backfill or view.

## 8. Security, Compliance, and Ethics

- Verification: KYC + liveness for Faces and before agency creation.
- Privacy-first: consented uploads, minimization, encryption in transit/at rest, DSRs.
- Trust & Traceability: invisible watermarking; C2PA manifest (P2) for attribution.
- AuthN/AuthZ: Keycloak (OIDC/OAuth2); roles for Faces, Creators, Brands, Admins.
- Moderation: automated image checks (Rekognition) + policy guardrails.

## 9. Monetization Model

| Model         | Description                            | Tracking/Attribution                                 | Priority |
| ------------- | -------------------------------------- | ---------------------------------------------------- | -------- |
| Flat Fee      | Fixed price per time unit set by Face. | Royalty Ledger entry at booking payment.             | P0/P1    |
| Spend-Share   | % of real ad spend earned by Face.     | OAuth to ad APIs; nightly retrieval of cost metrics. | Phase 2  |
| Revenue-Share | % of sales earned by Face.             | UTM or Face-specific coupons + Shopify/Stripe data.  | Phase 2  |

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
- SUPABASE_BUCKET_PRIVATE (default: likelee-private)
- SUPABASE_BUCKET_PUBLIC (default: likelee-public)
- SUPABASE_BUCKET_TEMP (default: likelee-temp)
- PORT (default: 8787)
- VERIFF_BASE_URL (required)
- VERIFF_API_KEY (required)
- VERIFF_SHARED_SECRET (required)
- DUIX_BASE_URL (default: http://127.0.0.1:7860)
- DUIX_AUTH_TOKEN (default: change-me)
- MODERATION_ENABLED (default: "1", set to "0" to disable Rekognition image moderation)
- AWS_REGION (default: us-east-1)
- ELEVENLABS_API_KEY (optional; required to enable server-side voice cloning)

- CREATIFY_BASE_URL (default: https://creatify.ai)
- CREATIFY_API_ID (required for Creatify API auth)
- CREATIFY_API_KEY (required for Creatify API auth)
- CREATIFY_CALLBACK_URL (optional; public HTTPS URL for Creatify webhooks hitting /webhooks/creatify)

Notes:

- All runtime config is read only via `ServerConfig` (envconfig). Do NOT call `std::env::var` in application code.
- Keep `likelee-server/.env.example` in sync with these variables and defaults.

### Data Modeling Rules

- Prefer PostgreSQL ENUM types over free-text (`text`) for any bounded set of variants (e.g., booking `status`, `type`, `rate_type`). This ensures input validation at the database layer and consistent API contracts.
- When introducing a new bounded field:
  - Add a dedicated `CREATE TYPE ... AS ENUM (...)` in the migration.
  - Reference the enum type in the column definition with an explicit default when appropriate.
  - Reflect the allowed values in UI selects and request validators.

### Bookings (Agency Dashboard)

- Table: `public.bookings`
  - Key columns: `agency_user_id`, `talent_id`, `talent_name`, `client_name`, `date`.
  - Enum columns:
    - `type` → `public.booking_type` (casting, option, confirmed, test-shoot, fitting, rehearsal)
    - `status` → `public.booking_status` (pending, confirmed, completed, cancelled)
    - `rate_type` → `public.booking_rate_type` (day, hourly, flat, tbd)
  - RLS: select/insert/update constrained to `auth.uid() = agency_user_id`.

### Environment Variables (Frontend – likelee-ui)

- VITE_API_BASE_URL – e.g. http://localhost:8787
- VITE_AWS_REGION – must be a valid AWS region (e.g., us-east-1, eu-west-1)
- VITE_COGNITO_IDENTITY_POOL_ID – e.g., us-east-1:xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx

### Storage Architecture (Supabase)

- Buckets
  - likelee-private (private): sensitive creator assets and drafts.
  - likelee-public (public): publicly viewable reference images and approved assets.
  - likelee-temp (private): temporary uploads prior to moderation.
- Paths
  - likelee-public: `likeness/{user_id}/sections/{section_id}/{ts}.{ext}` (images section is public by design.)
  - likelee-private:
    - `likeness/{user_id}/voice/recordings/{ts}.{ext}` (Face voice recordings)
    - other legacy paths migrated into structured tables
  - likelee-temp: `tmp/{user_id}/{uuid}.{ext}` (auto-clean TTL ~24h).
- Access
  - Public bucket is read-public; writes via server only.
  - Private/temp buckets are non-public; access via signed URLs when required (e.g., brand consumption of licensed voice recordings).
- Moderation Flow
  - Pre-scan bytes → upload → post-scan (best-effort) → DB mark `approved` or move to quarantine.
- Migration note
  - The three cameo images (front, left, right) are fully moved into `reference_images` using section_ids (e.g., `cameo_front`, `cameo_left`, `cameo_right`) or mapped to existing headshot sections. Profiles no longer store separate cameo URL columns for new writes.

### Diagnostics & Observability

- Frontend logs:
  - Log pre-resolved credential source and partial AccessKeyId.
  - Log session creation, modal open/close, analysis complete, and result payload.
- Network expectations:
  - With pre-resolved creds you may not see Cognito calls, but must see Rekognition `StartFaceLivenessSession`/stream.
- CloudTrail checks (region-aligned):
  - Server: `CreateFaceLivenessSession`, `GetFaceLivenessSessionResults`.
  - Client: `StartFaceLivenessSession`.

### Pitfalls to Avoid

- Passing wrong or unsupported prop names to older versions of `@aws-amplify/ui-react-liveness`. If stuck, upgrade `aws-amplify` and `@aws-amplify/ui-react-liveness` to latest.
- Region mismatch among server, frontend, and Cognito Identity Pool.
- Not granting `cognito-identity:*` actions to the unauth role.
- Rendering the detector after the result arrives (leads to perpetual “Verifying…”).
- Reading env vars directly in runtime code outside the config module (server). Always use `ServerConfig`.


### Operational Guidance

- If session creation succeeds but UI stays pending: verify CloudTrail for `StartFaceLivenessSession` in the selected region.
- If no event appears: fix Cognito role trust/policy or region mismatch; ensure camera/mic are allowed.

### Signup Flow State Persistence & Data Recovery

To ensure a robust multi-step signup flow (especially after external redirects like Veriff), the following mechanisms are implemented:

- **Local State Persistence**: Critical fields like `creatorType` are persisted to `localStorage` on change.
- **Data Recovery on Mount**: When the `ReserveProfile` component mounts, it checks for an authenticated user. If present, it fetches existing profile data from Supabase and merges it into the local `formData` state. This acts as a safety net if `localStorage` is cleared or the session is lost during redirect.
- **Robust Finalization**: The `finalizeProfile` function uses the recovered/merged data and validates critical fields (like pricing) before the final upsert, preventing amnesia-related data loss or constraint violations.
- **Pricing Validation**: Hard fallbacks for pricing are avoided. If pricing data is missing after recovery, the user is redirected back to the pricing step to ensure explicit consent and data integrity.

---

erDiagram
BOOKINGS {
uuid id PK
uuid agency_user_id "REFERENCES auth.users(id) ON DELETE CASCADE"
uuid talent_id FK "REFERENCES creators(id) ON DELETE SET NULL"
text talent_name
text client_name
booking_type type "casting|option|confirmed|test-shoot|fitting|rehearsal"
booking_status status "pending|confirmed|completed|cancelled"
date date
boolean all_day
text call_time
text wrap_time
text location
text location_notes
integer rate_cents
text currency "default 'USD'"
booking_rate_type rate_type "day|hourly|flat|tbd"
text usage_terms
text usage_duration
boolean exclusive
text notes
timestamptz created_at
timestamptz updated_at
}

CREATORS ||--o{ BOOKINGS : talent_id

Appendix: Add Context/Container/Component/Deployment diagrams. Link ADRs for IdP, Stripe model, watermarking/C2PA, model routing providers.
