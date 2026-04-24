# Implementation Plan: Active Session Audit

## Overview

Implement the Active Session Audit feature across three layers: a new `sessions/` Rust module directory in `likelee-server/src/sessions/` (following the same pattern as `team/`, `studio/`, and `services/`) that proxies to the Supabase Admin API, a typed `api/sessions.ts` module and `useSessionAudit` hook in `likelee-ui`, and `ActiveSessionAudit` / `SessionCard` React components wired into the Security & Legal tab of all three dashboards (Creator, Brand, Agency).

## Tasks

- [x] 1. Implement the `sessions/` backend module
  - Create the directory `likelee-server/src/sessions/` (matching the pattern of `team/`, `studio/`, `services/`)
  - Create `likelee-server/src/sessions/mod.rs` — re-exports all public items from the sub-modules and declares the four public handler functions: `list_sessions`, `revoke_session`, `revoke_all_other_sessions`, `get_login_history`
  - Create `likelee-server/src/sessions/types.rs` — defines all shared structs with `Serialize`/`Deserialize`: `SessionInfo`, `LoginEvent`, `ListSessionsResponse`, `LoginHistoryResponse`, `LoginHistoryParams`, `RevokeAllResponse`, and the raw Supabase response shapes
  - Create `likelee-server/src/sessions/ua_parser.rs` — implements `parse_user_agent(ua: &str) -> (String, String)` returning `(device_label, device_type)` where `device_type` ∈ `{"desktop", "mobile", "tablet", "unknown"}` and `device_label` falls back to `"Unknown Device"` for empty/unrecognised input
  - Create `likelee-server/src/sessions/handlers.rs` — implements the four axum handler functions:
    - `list_sessions`: call `GET /auth/v1/admin/users/{uid}/sessions` via `reqwest` using `state.supabase_service_key`; call `identify_current_session`; transform to `SessionInfo`; sort current first then by `last_active_at` descending; return `ListSessionsResponse`
    - `revoke_session`: guard `session_id` ≠ caller's `sid` (HTTP 403 `"cannot_revoke_current_session"`); call `DELETE /auth/v1/admin/users/{uid}/sessions/{session_id}`; treat Supabase 404 as success; return HTTP 502 on network/5xx errors
    - `revoke_all_other_sessions`: fetch all sessions, filter out current, issue concurrent DELETEs via `tokio::join_all`; return `{ revoked_count: N }`
    - `get_login_history`: call `GET /auth/v1/admin/users/{uid}/audit-log-entries`; filter to login-related events; apply `limit` (default 50, max 100); return `LoginHistoryResponse`
  - Create `likelee-server/src/sessions/current_session.rs` — implements `identify_current_session(sessions, jwt_claims) -> Option<String>` matching `sid` claim against `session.id`; falls back to `user_agent` + `created_at` proximity when `sid` absent; logs a warning on fallback
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 1.1 Write unit tests for `parse_user_agent` in `ua_parser.rs`
    - Test with common UA strings: Chrome/macOS, Safari/iPhone, Firefox/Windows, Android Chrome, iPad Safari
    - Test with empty string, null-equivalent, and garbage input — assert `device_label` is never empty and `device_type` is always a valid enum value
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 1.2 Write property test for `parse_user_agent` — Property 5: Device label completeness
    - **Property 5: For any user-agent string (including empty string and unrecognised formats), `parse_user_agent` returns a non-empty `device_label`**
    - Add `proptest = "1"` as a `[dev-dependency]` in `Cargo.toml` and write the property test in `ua_parser.rs`
    - **Validates: Requirements 7.1, 9.1**

  - [ ]* 1.3 Write property test for `parse_user_agent` — Property 6: Device type is always a valid enum value
    - **Property 6: For any user-agent string, `parse_user_agent` returns a `device_type` that is exactly one of `"desktop"`, `"mobile"`, `"tablet"`, or `"unknown"`**
    - **Validates: Requirements 7.2, 9.1**

  - [ ]* 1.4 Write unit tests for `identify_current_session` in `current_session.rs`
    - Test: matching `sid` claim returns `Some(session_id)`
    - Test: non-matching claim returns `None`
    - Test: empty session list returns `None`
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 2. Register session routes in `router.rs` and declare the module
  - Add `pub mod sessions;` to `likelee-server/src/lib.rs`
  - Add four route entries to `build_router()` in `likelee-server/src/router.rs`:
    - `GET /api/auth/sessions` → `crate::sessions::list_sessions`
    - `DELETE /api/auth/sessions/:session_id` → `crate::sessions::revoke_session`
    - `DELETE /api/auth/sessions` → `crate::sessions::revoke_all_other_sessions`
    - `GET /api/auth/login-history` → `crate::sessions::get_login_history`
  - Verify the server compiles with `cargo check`
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3. Checkpoint — Rust layer
  - Run `cargo check` and `cargo test` in `likelee-server/`; ensure all tests pass and there are no compilation errors. Ask the user if questions arise.

- [x] 4. Implement the frontend API module `api/sessions.ts`
  - Create `likelee-ui/src/api/sessions.ts` following the same pattern as `api/functions.ts` (using `base44Client`)
  - Define and export TypeScript interfaces: `SessionInfo`, `LoginEvent`, `ListSessionsResponse`, `LoginHistoryResponse`, `RevokeAllResponse`
  - Implement and export four typed wrapper functions:
    - `listSessions(): Promise<ListSessionsResponse>` — `GET /api/auth/sessions`
    - `revokeSession(sessionId: string): Promise<void>` — `DELETE /api/auth/sessions/:sessionId`
    - `revokeAllOtherSessions(): Promise<RevokeAllResponse>` — `DELETE /api/auth/sessions`
    - `getLoginHistory(params?: { limit?: number }): Promise<LoginHistoryResponse>` — `GET /api/auth/login-history`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 9.3, 9.4_

- [x] 5. Implement the `useSessionAudit` hook
  - Create `likelee-ui/src/hooks/useSessionAudit.ts`
  - Implement `UseSessionAuditReturn` interface with: `sessions`, `loginHistory`, `currentSessionId`, `isLoading`, `isRevoking`, `error`, `revokeSession`, `revokeAllOtherSessions`, `refresh`
  - On mount, call `listSessions()` and `getLoginHistory()` concurrently; set `isLoading` during fetch; set `error` on failure
  - `revokeSession(sessionId)`: set `isRevoking` true; call `api.revokeSession`; on success remove the session from state; on failure preserve state; reset `isRevoking` in both cases
  - `revokeAllOtherSessions()`: call `api.revokeAllOtherSessions`; on success retain only the current session in state; on failure preserve state
  - `refresh()`: re-fetch sessions and login history
  - _Requirements: 2.1, 3.1, 3.3, 3.6, 4.2, 5.1_

  - [ ]* 5.1 Write unit tests for `useSessionAudit`
    - Use `vitest` + `@testing-library/react` with mocked `api/sessions.ts`
    - Test: initial load sets `isLoading` then populates `sessions` and `loginHistory`
    - Test: `revokeSession` removes the target session from state on success and leaves state unchanged on failure
    - Test: `revokeAllOtherSessions` retains only the current session on success
    - Test: fetch failure sets `error` string
    - _Requirements: 2.1, 3.1, 3.3, 4.2, 5.1_

  - [ ]* 5.2 Write property test for `revokeAllOtherSessions` — Property 7: Bulk revoke never touches the current session
    - **Property 7: For any set of sessions and any `currentSessionId`, the sessions array after `revokeAllOtherSessions` contains exactly one entry whose `id === currentSessionId`**
    - Use `fast-check` (already in `devDependencies`) with arbitrary session arrays
    - **Validates: Requirements 4.3**

- [x] 6. Implement the `SessionCard` component
  - Create `likelee-ui/src/components/security/SessionCard.tsx`
  - Accept `SessionCardProps`: `session: SessionInfo`, `isCurrent: boolean`, `onRevoke: (sessionId: string) => void`, `isRevoking: boolean`
  - Render device type icon (`Monitor` for desktop, `Smartphone` for mobile, `Tablet` for tablet, `HelpCircle` for unknown) from `lucide-react`
  - Display `device_label`, `ip_address` (or "IP unavailable"), and `last_active_at` formatted as a relative or absolute timestamp
  - Show a "Current session" `Badge` when `isCurrent === true`
  - Render a revoke `Button` that is disabled when `isCurrent === true` or `isRevoking === true`; show a `Loader2` spinner on the button while `isRevoking`
  - Use `shadcn/ui` `Card`, `Badge`, `Button` components
  - _Requirements: 2.2, 2.3, 3.4, 3.6_

  - [ ]* 6.1 Write unit tests for `SessionCard`
    - Test: revoke button is disabled when `isCurrent === true`
    - Test: revoke button is enabled when `isCurrent === false` and `isRevoking === false`
    - Test: revoke button shows loading state when `isRevoking === true`
    - Test: "Current session" badge is rendered only when `isCurrent === true`
    - _Requirements: 2.3, 3.4, 3.6_

- [x] 7. Implement the `ActiveSessionAudit` component
  - Create `likelee-ui/src/components/security/ActiveSessionAudit.tsx`
  - Accept `ActiveSessionAuditProps`: `variant?: "brand" | "agency" | "creator"`
  - Use `useSessionAudit` hook for all data and mutations
  - Render a list of `SessionCard` components; pass `isCurrent={session.id === currentSessionId}` and `onRevoke={revokeSession}`
  - Sort display: current session first, then by `last_active_at` descending (hook already provides sorted data)
  - Show `Skeleton` loading cards while `isLoading === true`
  - Show an empty state message when `sessions.length === 0` and not loading
  - Show an inline error state with a "Retry" button when `error !== null`
  - Render a "Sign out all other devices" `Button` that opens a confirmation `Dialog` before calling `revokeAllOtherSessions`; close the dialog on both confirm and cancel
  - Show success/error toasts using the project's `useToast` hook after revoke and bulk-revoke operations
  - Render a collapsible login history section (using `shadcn/ui` `Collapsible`) displaying the last 50 `LoginEvent` entries with event type, timestamp, IP, and device label
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 4.1, 4.4, 4.5, 4.6, 5.2, 5.3_

  - [ ]* 7.1 Write unit tests for `ActiveSessionAudit`
    - Test: skeleton cards render while loading
    - Test: empty state renders when sessions array is empty
    - Test: error state with Retry button renders when `error` is set
    - Test: confirmation dialog appears before bulk revoke
    - Test: dialog closes after confirmation and after cancellation
    - _Requirements: 2.5, 2.6, 2.7, 4.1, 4.6_

  - [ ]* 7.2 Write property test for session list sort — Property 4: Sort stability — current session first
    - **Property 4: For any array of `SessionInfo` objects with exactly one `is_current === true` entry, the rendered session list always places that entry at index 0**
    - Use `fast-check` with arbitrary `SessionInfo` arrays (one item marked `is_current`)
    - **Validates: Requirements 2.4**

- [ ] 8. Checkpoint — Frontend components
  - Run `npm run test` in `likelee-ui/`; ensure all new tests pass. Run `npx tsc --noEmit` to confirm no TypeScript errors. Ask the user if questions arise.

- [x] 9. Wire `ActiveSessionAudit` into the three dashboards
  - In each of the three dashboard files (`likelee-ui/src/pages/BrandDashboard.tsx`, `AgencyDashboard.tsx`, `CreatorDashboard.tsx`):
    - Import `ActiveSessionAudit` from `@/components/security/ActiveSessionAudit`
    - Locate the Security & Legal settings tab (search for the existing "Coming Soon" placeholder button or the security section)
    - Replace the placeholder with an "Active Session Audit" `Button` that toggles a `showSessionAudit` boolean state
    - Render `<ActiveSessionAudit variant="brand" />` (or `"agency"` / `"creator"`) conditionally when `showSessionAudit === true`, inline within the Security & Legal tab
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 10. Final checkpoint — End-to-end integration
  - Run `npm run test` in `likelee-ui/` and `cargo test` in `likelee-server/`; ensure all tests pass with no errors. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The backend module lives at `likelee-server/src/sessions/` (a directory module, not a flat `.rs` file), matching the existing pattern of `team/`, `studio/`, and `services/`
- File layout inside `sessions/`:
  - `mod.rs` — public re-exports and module declarations
  - `types.rs` — all shared structs
  - `ua_parser.rs` — `parse_user_agent` function
  - `current_session.rs` — `identify_current_session` function
  - `handlers.rs` — the four axum handler functions
- `fast-check` is already present in `likelee-ui/devDependencies` — no new install needed
- Add `proptest = "1"` as a `[dev-dependency]` in `likelee-server/Cargo.toml` for tasks 1.2 and 1.3
- The Supabase service key is accessed via `state.supabase_service_key` (see `auth.rs` for the existing pattern)
- All four Rust handlers must use the existing `AuthUser` extractor — JWT validation is automatic
- The `base44Client` automatically attaches the Supabase Bearer token to every request; `api/sessions.ts` requires no additional auth wiring
- Checkpoints ensure incremental validation at the Rust layer boundary and after all frontend components are complete
