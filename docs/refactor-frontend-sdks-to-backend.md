# Refactor Plan: Move Supabase & Firebase SDK Usage from Frontend to Backend (Hybrid-first)

Owner: Platform
Status: Draft (ready for implementation)
Last updated: 2025-11-18

## Summary
Centralize privileged operations in the backend. Keep Firebase Auth UX in the browser for now, but remove Supabase SDK usage from the frontend and route all data mutations via our backend (Axum). The backend verifies Firebase ID tokens and writes to Supabase using the service role via PostgREST. This preserves security, auditability, and prepares us for a future IdP swap (e.g., Keycloak) without major UI churn.

## Why (Rationale)
- Security and least privilege: service keys remain server-side; browser only holds user tokens.
- Policy and invariants: backend enforces validation, anti-abuse, and business rules.
- Orchestration: coordinate Auth (Firebase), Data (Supabase), Payments, KYC in one place.
- Auditability & compliance: one traceable boundary for writes affecting KYC/PII.
- Vendor agility: UI calls our API; switching IdPs or data stores is mostly backend work.

## Scope Options
- Phase 1 (Hybrid – recommended now):
  - Keep Firebase Auth SDK in the frontend for sign-in/sign-out and token refresh.
  - Remove Supabase SDK from the frontend. The backend owns all writes.
- Phase 2 (Full proxy – optional):
  - Move MFA/TOTP flows and all Firebase Auth calls to backend REST.

## Backend Changes (Axum, Rust)
- Add Firebase token verification (ID token) per request for protected routes.
- New endpoints:
  - POST `/api/auth/register` → Firebase REST signUp; upsert Supabase `profiles`.
  - POST `/api/auth/login` → Firebase REST signInWithPassword.
  - POST `/api/auth/token/refresh` → Firebase securetoken refresh.
  - POST `/api/auth/logout` → stateless 200 (client clears storage).
  - POST `/api/profile/sync` (optional) → Ensure `profiles` row exists/updated by authenticated user.
- Env:
  - `FIREBASE_API_KEY`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (existing)

### Data invariants to enforce server-side
- `profiles.id == firebase_uid`.
- Request body `user_id` must match `sub` from ID token.
- Normalize email/display name; set `updated_at` on writes.

## Frontend Changes
- Replace `AuthProvider.tsx` calls with fetches to backend endpoints.
  - `register(email, password, displayName)` → POST `/api/auth/register`.
  - `login(email, password)` → POST `/api/auth/login`.
  - `logout()` → POST `/api/auth/logout` then clear state.
  - `refreshToken()` → POST `/api/auth/token/refresh`.
- Remove `supabase.from('profiles').upsert(...)` effect; rely on backend upsert during register (and optionally during login or `/api/profile/sync`).
- Maintain `id_token`/`refresh_token` in memory/localStorage; send `Authorization: Bearer <id_token>` to protected endpoints.
- Keep `TwoFactorSetup.tsx` as-is for now (Phase 2 migrates MFA to backend if/when needed).

## Endpoints: Request/Response
- POST `/api/auth/register`
  - Request: `{ email: string, password: string, display_name?: string }`
  - Response: `{ user_id: string, email: string, display_name?: string, id_token: string, refresh_token: string }`
- POST `/api/auth/login`
  - Request: `{ email: string, password: string }`
  - Response: `{ user_id: string, email: string, display_name?: string, id_token: string, refresh_token: string }`
- POST `/api/auth/token/refresh`
  - Request: `{ refresh_token: string }`
  - Response: `{ id_token: string, refresh_token: string }`
- POST `/api/profile/sync` (optional)
  - Headers: `Authorization: Bearer <id_token>`
  - Request: `{ email?: string, display_name?: string }`
  - Response: `{ ok: true }`

## Implementation Checklist
- Backend
  - [ ] Add `reqwest` for REST calls and Firebase token verification (or JWKS validation).
  - [ ] Implement `/api/auth/*` and optional `/api/profile/sync`.
  - [ ] Verify ID tokens on protected routes; map `sub -> user_id`.
  - [ ] Upsert into Supabase `profiles` via PostgREST with service key.
  - [ ] Add `FIREBASE_API_KEY` to server env and example file.
- Frontend
  - [ ] Replace Firebase SDK usages in `AuthProvider.tsx` with backend calls (Phase 1 keeps SDK acceptable only for state until fully removed).
  - [ ] Remove Supabase client usage from frontend; delete `supabase.ts` if fully unused.
  - [ ] Ensure KYC pages use backend (already the case) with `Authorization` header when needed.
- QA
  - [ ] Register/login/logout flows work; tokens persisted and refreshed.
  - [ ] Profile row appears/updates in Supabase.
  - [ ] RLS and backend validation block spoofed user_id.

## Rollback Plan
- Frontend can be toggled back to SDKs by feature flag if backend endpoints are unavailable.
- Keep old `supabase.ts` and Firebase SDK integration behind flags during transition.

## Future: Move to Keycloak (Design Alignment)
- Replace Firebase verification module with Keycloak/JWT validation in backend.
- Keep the same frontend <-> backend contract; mostly backend-only changes.
- Rework `/api/auth/*` to Keycloak flows or OIDC code flow with PKCE.

## Open Decisions
- Should backend upsert profile on every login (idempotent) or only on register? Default: on register + `/api/profile/sync`.
- Timeline for Phase 2 (MFA to backend).

