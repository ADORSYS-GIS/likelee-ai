# Likelee-AI – arc42 Architecture

Version: 0.1 (draft)

Owner: Shanel Pouatcha

---

## 1. Introduction and Goals

### 1.1 Context

Likelee AI is building the world’s first AI-creation ecosystem. This system is designed to counter the growing risk of unauthorized digital likeness usage by transforming faces into monetizable assets.

### 1.2 Key Goals

The system aims to keep humans at the center of AI-generated content, whether for campaigns, ads, or AI-generated/assisted films.

| Persona              | Likelee’s Goal                                                                                                         | Core Value                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Faces** (Talents)  | Secure the license for their likeness, get discovered, and earn royalties.                                             | Turn their face into an asset – gain visibility, generate royalties, and track usage.  |
| **Brands & Studios** | Provide a directory of talents for AI media, find approved likenesses, generate ethical content, and manage contracts. | Access a verified pool of human likenesses, AI creators, and talents in one interface. |
| **AI Creators**      | Serve as a collaboration platform, offer paid opportunities and portfolios.                                            | Discover gigs, license faces for creative work, and showcase their AI portfolio.       |

## 2. Architecture Constraints

### 2.1 Technical and Strategic Constraints

- Performance & Cost: Initial architecture uses Firebase Realtime Database; may switch services if scalability or cost becomes an issue.
- Early Monetization: Must support immediate recurring revenue (MRR) from day one (agency integration, studio credits).
- Integrated Workflow: Evolve from directory to creation platform to enable workflow lock-in.

### 2.2 Compliance and Ethics (Crosscutting)

- Verification: Mandatory KYC and liveness checks for Faces and before “Create Agency” becomes available.
- Trust/Traceability: Use of Invisible Watermarking and C2PA manifest (future/P2) for royalty tracking and conversion attribution.
- Privacy: Privacy-first design with clear consent steps for uploading face photos.

## 3. System Scope and Context

### 3.1 External Interfaces and Key Providers (APIs)

Likelee relies on several external integrations for essential functionality:

| Service                 | Function                                                                 | Provider / Technology                                                                |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Payments & Billing      | Transactions, royalties, subscriptions (Seat Billing), Stripe Tier Gate. | Stripe Connect, Stripe Checkout.                                                     |
| AI Generation/Rendering | Model routing for image/video generation by AI Creators.                 | Replicate API, Hugging Face APIs, Together.ai.                                       |
| Storage & Database      | User profiles, waitlist submissions, and uploaded photos.                | Firebase Realtime Database, Firebase Storage.                                        |
| Asset Traceability      | Invisible watermarking for exports.                                      | Truepic Lens.                                                                        |
| Moderation              | Analysis of uploaded images.                                             | AWS Rekognition.                                                                     |
| Royalty Tracking        | Fetching ad-spend and sales data for spend-share/revenue-share models.   | Meta Ads API, TikTok Ads API, Google Ads API, Shopify Admin API, Stripe (read-only). |

## 4. Solution Strategy

### 4.1 Tech Stack Overview

- Frontend: React 18.2.0, TypeScript, Vite 6.5, Tailwind CSS 3.4.16.
- Backend & Database: Firebase Realtime Database (NoSQL), Firebase Authentication, Firebase Storage.

The solution strategy remains: SPA frontend consuming API(s), modular services as needed, with emphasis on privacy, scalability, and AI safety.

## 5. Building Block View

### 5.1 Top-Level Structure

- **likelee-ui (Web)**: Vite + React client, integrates with platform APIs.
- **API Gateway / BFF**: Single entry for UI, aggregates downstream services. TODO: confirm presence.
- **Creator Service**: Manage creator profiles, assets, publishing workflows.
- **Brand Service**: Catalog discovery, contracts, entitlements.
- **Experience Service**: Runtime orchestration of AI experiences and sessions.
- **AI Service**: Providers integration, model/catalog management, guardrails.
- **Identity/Access**: Authentication, authorization, roles, permissions via Keycloak.
- **Billing/Payments**: Monetization flows, metering. TODO: confirm provider.
- **Storage**: Asset and result storage; signed URLs/CDN.

### 5.2 Key Interfaces

- UI ↔ BFF/API: HTTPS JSON (REST/GraphQL). TODO: specify.
- Services ↔ AI providers: HTTPS; provider SDKs. TODO: list providers.
- Services ↔ Storage: Object store APIs.
- Services ↔ IdP (Keycloak): OIDC/OAuth2 flows.

### 5.3 Key System Services

- Royalty Ledger: Records booking events (flat-fee transactions) and provides read access for dashboards.
- Watermark API: Applies invisible watermarks on exports, storing a hash tied to the booking ID.
- Payment (Stripe Connect): Manages split payments (Brand → Platform → Face + Creator) and transfers to Stripe Express accounts.
- Localization (i18n): Default English; Spanish and French prioritized for MVP.
- Likelee Studio: Includes the Model Router (Replicate/Hugging Face routing) and Simple Prompt UI.

## 6. Runtime View

### 6.1 Core Flow for AI Creators

1. Discovery: Creator searches/browses Faces using filters.
2. Booking: Creator adds a Face to the project basket and proceeds to checkout via Stripe.
3. License/Generation: Pay for short-term likeness rights. In the Likelee Studio, they can:
   - Select a model via the Model Router (2–3 max).
   - Use the Simple Prompt UI.
   - Pay credits (Creator Tier) or monthly access (Pro Tier) for generation.
4. Collaboration: A simple chat thread allows communication with brands/studios or other creators.

### 6.2 P0 Flow: Agency Onboarding

1. Verification: The agency owner completes KYC.
2. Seat Purchase: “Create Agency” appears, and the agency buys blocks of 50 seats at $35/seat/month via Stripe.
3. Import: Agency uploads talent info (name, email, selfie) via CSV or drag-and-drop, triggering auto-invites.
4. Activation: A seat becomes active when the Face accepts the terms and conditions.

## 7. Deployment View

- **Environments**: Dev, Staging, Prod. TODO: confirm.
- **Hosting**: Containerized services on managed Kubernetes or serverless. TODO: choose.
- **CI/CD**: Build (lint, test), image build, deploy via pipeline. TODO: specify tooling.
- **Observability**: Centralized logs, metrics, traces; alerting on SLOs.
- **CDN**: For static assets and AI outputs if appropriate.

## 8. Cross-cutting Concepts

- **Security & Privacy**: Least privilege, data minimization, encryption in transit/at rest, DSRs handling.
- **API Design**: Versioning, pagination, error model, idempotency.
- **Domain Model**: Creator, Asset, Brand, Contract, Experience, Session, Entitlement.
- **Resilience**: Timeouts, retries, bulkheads, circuit breakers, rate limiting.
- **Caching**: Edge CDN + server-side cache for catalogs; per-session cache.
- **Internationalization**: i18n/l10n for UI; time zones and locale-aware formatting. TODO: confirm locales.
- **Accessibility**: WCAG targets for UI.

### 8.1 Monetization Model

The system supports multiple licensing models to generate revenue for Likelee and Faces:

| License Model | Description                                            | Attribution / Tracking                                                       | Priority |
| ------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- | -------- |
| Flat Fee      | Face sets a fixed price ($5–$200) per time unit.       | Recorded in the Royalty Ledger at booking payment.                           | P0/P1    |
| Spend-Share   | Face earns a % (5%–15%) of real ad spend by the brand. | Tracked via OAuth with ad APIs; nightly cost-metric retrieval.               | Phase 2  |
| Revenue-Share | Face earns a % (2%–10%) of total sales.                | Tracked via UTM or Face-specific coupon codes + data from Shopify or Stripe. | Phase 2  |

To reinforce the advanced royalty model: Likelee’s royalty system works like a digital bank ledger. Instead of selling the “item” (the face) for a one-time price (Flat Fee), the system allows the Face to receive ongoing earnings from the money flowing through the brand’s account (Spend-Share or Revenue-Share). The C2PA manifest is like a serial number engraved on a banknote, ensuring all financial flows linked to that “note” are trackable and attributable to the face’s owner.

### 8.2 Design and Aesthetic

- Vibe: Futuristic yet Familiar, Raw yet Refined, Ethical and Transparent.
- Visual Style: Clean grids, futuristic typography, organic overlays (hand-drawn lines, sketches, pencil textures). A black/white palette with muted neon orange, pale blue, and soft yellow accents.

## 9. Architecture Decisions

- ADR-001: Use Vite + React for web UI (existing). Status: Accepted.
- ADR-002: Adopt Keycloak as IdP (OIDC/OAuth2). Status: Accepted.
- ADR-003: Select AI provider(s) and guardrail approach. Status: Proposed. TODO.

## 10. Quality Requirements

### 10.1 Quality Goals

- **QG1 Performance**: P95 end-user interaction latency < TODO ms for key flows.
- **QG2 Availability**: 99.9% monthly for public experiences.
- **QG3 Security**: No critical vulnerabilities; SOC2-ready controls. TODO: confirm.
- **QG4 Usability**: A11y baseline (WCAG 2.1 AA), responsive UI.

### 10.2 Scenarios

- Load spike on a popular experience; system auto-scales without error rate >1%. TODO: detail.
- Provider outage; graceful degradation/failover to alternative. TODO: design.

## 11. Risks and Technical Debt

- AI provider lock-in and cost variability. Mitigation: abstraction layer, usage caps.
- Content moderation and policy compliance gaps. Mitigation: guardrails + human review.
- Data privacy risks with user content. Mitigation: DPIA, minimization, encryption.

## 12. Glossary

- **Face**: End user of AI experiences/content.
- **Creator (AI Creator)**: Builds and publishes AI assets/experiences.
- **Brand**: Organization procuring creator assets for campaigns.
- **Experience**: A packaged, runnable AI interaction flow.
- **BFF**: Backend-for-Frontend API layer.

---

Appendix: Add diagrams (C4/arc42) as needed: Context, Container, Component, Runtime, Deployment.
