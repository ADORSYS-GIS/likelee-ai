# Repository Rules

## General

- Always implement based on the design.md file located at `./docs/design.md`. If anything is unclear, ask questions in the PR and propose options.

## Code

- Follow `docs/design.md` for architecture, configuration, and integration details.
- Keep code changes minimal and cohesive. Avoid adding files that aren’t necessary to the task.
- Do not add or delete comments/documentation unless requested.
- Include request IDs and label counts/results where helpful. Avoid logging sensitive data.
- always update this file when a milestone is hit and also update the design.md doc

## Configuration Management (Server)

- Centralize all runtime config in `likelee-server/src/config.rs` using the Rust `envconfig` crate with `#[derive(Envconfig)]`.
- Do NOT read environment variables directly in application code (`std::env::var`) outside the configuration module.
- Keep `likelee-server/.env.example` in sync with `ServerConfig` fields and defaults.
- `.env` files must be one `KEY=VALUE` per line (no commas, no inline comments).

## AWS Rekognition – Moderation & Face Liveness

- Use only valid and supported AWS regions. INVALID examples: `eu-east-1`, `us-central-1`.
- Region alignment is mandatory across:
  - Backend: `AWS_REGION`
  - Frontend: `VITE_AWS_REGION`
  - Cognito Identity Pool region
    All three MUST match (e.g., `us-east-1` or `eu-west-1`).
- IAM (server credentials used by likelee-server):
  - Allow `rekognition:CreateFaceLivenessSession`
  - Allow `rekognition:GetFaceLivenessSessionResults`
- IAM (browser via Cognito Identity Pool role):
  - Allow `rekognition:StartFaceLivenessSession`
  - Trust policy must restrict to your Identity Pool and amr:
    - `"cognito-identity.amazonaws.com:aud": "<IDENTITY_POOL_ID>"`
    - `"ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "unauthenticated" }` (or `authenticated` if using the auth role)
- Ensure Rekognition service‑linked role (AWSServiceRoleForRekognition) exists or allow `iam:CreateServiceLinkedRole`.
- Image moderation request limits: max 5MB payloads.

## Frontend – Face Liveness Integration

- Use `@aws-amplify/ui-react-liveness` FaceLivenessDetector.
- Import CSS in `src/main.tsx`:
  - `@aws-amplify/ui-react/styles.css`
  - `@aws-amplify/ui-react-liveness/styles.css`
- Provide Cognito Identity Pool credentials at runtime; the Identity Pool must be in the same region as `VITE_AWS_REGION`.
- Render the detector inside a portal‑based modal (e.g., React `createPortal`) to avoid stacking/overflow issues.
- On completion, call `/api/liveness/result` and evaluate `passed` vs `LIVENESS_MIN_SCORE`.

## Security

- Never commit real secrets. Rotate keys immediately if they appear in logs or commits.
- Prefer IAM roles over long‑lived access keys where feasible.

## Database/Migrations

- When adding migrations (`supabase/migrations/*.sql`), generate a Mermaid ER diagram for table relations and include it in the PR.

## Logging/Diagnostics

- Log effective AWS region at startup and warn on non‑supported or mismatched regions.
- Include request IDs and label counts/results where helpful. Avoid logging sensitive data.

## Milestones

- [x] **Campaign Deliverables & Secure Media Authentication (2026-03-08)**: Implemented multi-stage deliverable review workflow (draft -> submitted -> approved) and secure media proxy with JWT token fallback in query parameters for browser-native media elements.
- [x] **Creator Payment Gate (2026-03-17)**: Implemented comprehensive payment gating for campaign deliverables. Restricted uploads and submissions for unpaid offers on both Agency and Creator dashboards, enhanced backend API with payment status, and integrated Stripe-based campaign offer checkout.
- [x] **Messaging Hub Enhancements (2026-04-02)**: Enhanced messaging UI with circular send buttons, rounded bubbles, and green ticks. Implemented message editing and soft deletion support in backend and frontend. Added search and filtering (All/Unread) to the thread list.
- [x] **Creator Free Trial Standardization & Checkout Fix (2026-04-09)**: Standardized Creator trial flow to require upfront payment details via Stripe Checkout. Resolved session bug by forcing card collection for trials. Fixed plan card interactions to correctly initiate trials on click.
- [x] **Creator Subscription Upgrade & Trial Refinement (2026-04-10)**: Standardized the Creator upgrade flow to preserve existing trial periods when switching plans (e.g., Basic to Pro). Implemented a custom backend upgrade endpoint, improved dashboard navigation, and added high-fidelity UI cues including 'Try Pro' labels and trial continuation disclaimers.
- [x] **Vulnerability Fixes & Dependency Audit (2026-04-15)**: Resolved critical `rustls-webpki` vulnerabilities in backend by transitioning `async-stripe` to use `native-tls` and upgrading other dependencies. Corrected unsoundness issues in `rand` and verified with `cargo audit` and `cargo clippy`.
