---
trigger: always_on
---

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
- IDs must be generated at the database level.
  - Primary keys should use DB defaults (e.g., `uuid_generate_v4()` / `gen_random_uuid()`) and must not be provided by clients or backend code.
  - Server handlers must not require clients to send `id` fields; derive foreign keys from authenticated context or headers where possible.
  - Any exception must be explicitly documented in `docs/design.md` and validated in code.

## Logging/Diagnostics
- Log effective AWS region at startup and warn on non‑supported or mismatched regions.
- Include request IDs and label counts/results where helpful. Avoid logging sensitive data.

## Local CI Pre‑Push Checklist
- **Backend (likelee-server)**
  - Format check (no writes): `cargo fmt -- --check`
  - Lint (deny warnings): `cargo clippy -- -D warnings`
  - Build: `cargo build --verbose`
  - Tests: `cargo test --verbose`
  - Security audit: `cargo audit`
  - Autofix helpers when needed:
    - Apply formatter: `cargo fmt`
    - Update cargo-audit if missing: `cargo install cargo-audit --locked`

- **Frontend (likelee-ui)**
  - Install: `npm install`
  - Formatting check: `npx prettier --check .`
  - Lint: `npm run lint`
  - Build: `npm run build`
  - Tests: `npm run test`
  - Security audit: `npm audit`
  - Autofix helpers when needed:
    - Apply formatter: `npx prettier --write .`

- **Push gate**
  - Only push when all steps above pass locally.
  - If configuration changes are introduced, update:
    - `likelee-server/src/config.rs` (Envconfig fields & defaults)
    - `likelee-server/.env.example` to match `ServerConfig`
    - `docs/design.md` under “Configuration Management”