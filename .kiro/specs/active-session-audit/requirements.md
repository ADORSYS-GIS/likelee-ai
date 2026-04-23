# Requirements Document

## Introduction

The Active Session Audit feature gives Likelee users full visibility into every active login session on their account and the ability to revoke individual sessions or sign out all other devices in one action. It also surfaces a paginated login history trail. The feature is integrated into the existing **Security & Legal** settings tab across all three dashboards (Creator, Brand, Agency), replacing the current "Coming Soon" placeholder. The implementation spans the React frontend (`likelee-ui`), the Rust backend (`likelee-server`), and the Supabase Auth service.

---

## Glossary

- **ActiveSessionAudit**: The React component that renders the session audit panel inside the Security & Legal settings tab.
- **SessionCard**: The React component that renders a single session row with device metadata and revocation controls.
- **SessionAuditHook**: The `useSessionAudit` React hook that encapsulates all data-fetching and mutation logic for the panel.
- **SessionsAPI**: The `api/sessions.ts` module providing typed wrappers around the Rust backend session endpoints.
- **SessionsHandler**: The `sessions.rs` Rust module that handles all session-related HTTP requests and proxies to the Supabase Admin API.
- **Backend**: The `likelee-server` Rust application.
- **UAParser**: The user-agent parsing function (`parse_user_agent`) in the Rust backend.
- **SessionInfo**: The shared data model representing a single active session, containing id, timestamps, IP address, user-agent, device label, device type, and current-session flag.
- **LoginEvent**: The data model representing a single entry from the login history trail.
- **CurrentSession**: The active session corresponding to the JWT used in the current request, identified by matching the `sid` claim.
- **BulkRevoke**: The operation that revokes all sessions except the CurrentSession in a single user action.
- **Dashboard**: Any of the three Likelee dashboards — Creator, Brand, or Agency.

---

## Requirements

### Requirement 1: Session Audit Entry Point

**User Story:** As a Likelee user, I want to access the Active Session Audit panel from the Security & Legal settings tab in my dashboard, so that I can manage my account sessions without leaving the settings area.

#### Acceptance Criteria

1. THE Dashboard SHALL display an "Active Session Audit" button or entry point within the Security & Legal settings tab in all three dashboard variants (Creator, Brand, Agency).
2. WHEN a user activates the Active Session Audit entry point, THE ActiveSessionAudit component SHALL render inline within the Security & Legal tab.
3. THE ActiveSessionAudit component SHALL accept a `variant` prop with values `"brand"`, `"agency"`, or `"creator"` and render consistently across all three dashboards.
4. WHEN the ActiveSessionAudit panel is open, THE ActiveSessionAudit component SHALL fetch active session data on mount without requiring a manual refresh.

---

### Requirement 2: Session List Display

**User Story:** As a Likelee user, I want to see all my active sessions with device and location details, so that I can identify any unfamiliar or unauthorized logins.

#### Acceptance Criteria

1. WHEN a user opens the Active Session Audit panel, THE SessionAuditHook SHALL fetch all active sessions for the authenticated user from the Backend and expose them to the ActiveSessionAudit component.
2. WHEN sessions are displayed, THE SessionCard SHALL show the device label, device type icon, IP address, and last active timestamp for each session.
3. WHEN sessions are displayed, THE ActiveSessionAudit component SHALL badge the CurrentSession distinctly from all other sessions.
4. WHEN sessions are displayed, THE ActiveSessionAudit component SHALL sort the CurrentSession first in the list, followed by remaining sessions ordered by `last_active_at` descending.
5. WHILE the session list is loading, THE ActiveSessionAudit component SHALL display skeleton loading states in place of session cards.
6. WHEN no active sessions are returned, THE ActiveSessionAudit component SHALL display an appropriate empty state message.
7. IF fetching sessions fails, THEN THE ActiveSessionAudit component SHALL display an inline error state with a "Retry" button that re-triggers the fetch.

---

### Requirement 3: Single Session Revocation

**User Story:** As a Likelee user, I want to revoke individual active sessions, so that I can remove access from specific devices I no longer use or recognize.

#### Acceptance Criteria

1. WHEN a user clicks the revoke button for a non-current session, THE SessionAuditHook SHALL send a DELETE request to `DELETE /api/auth/sessions/:session_id` and remove the session from the displayed list on success.
2. WHEN a session is successfully revoked, THE ActiveSessionAudit component SHALL display a success toast notification.
3. IF a revocation request fails, THEN THE ActiveSessionAudit component SHALL display an error toast notification and leave the session list unchanged.
4. THE SessionCard SHALL disable the revoke button when `isCurrent` is `true`, preventing the user from revoking their own active session through the UI.
5. IF a DELETE request targets the session ID matching the caller's JWT `sid` claim, THEN THE SessionsHandler SHALL return HTTP 403 with error code `"cannot_revoke_current_session"`.
6. WHILE a revocation is in progress, THE SessionCard SHALL display a loading indicator on the revoke button and prevent duplicate requests.

---

### Requirement 4: Bulk Session Revocation

**User Story:** As a Likelee user, I want to sign out all other devices in one action, so that I can quickly secure my account if I suspect unauthorized access.

#### Acceptance Criteria

1. WHEN a user clicks "Sign out all other devices", THE ActiveSessionAudit component SHALL display a confirmation dialog before initiating any revocation.
2. WHEN a user confirms the bulk revocation, THE SessionAuditHook SHALL call `DELETE /api/auth/sessions?keep_current=true` and the Backend SHALL revoke all sessions except the CurrentSession.
3. THE SessionsHandler SHALL never include the CurrentSession in the set of sessions revoked during a BulkRevoke operation.
4. WHEN bulk revocation completes successfully, THE ActiveSessionAudit component SHALL display a toast notification showing the count of revoked sessions.
5. IF bulk revocation fails, THEN THE ActiveSessionAudit component SHALL display an error toast and leave the session list unchanged.
6. WHEN the confirmation dialog is dismissed (confirmed or cancelled), THE ActiveSessionAudit component SHALL close the dialog regardless of the outcome.

---

### Requirement 5: Login History

**User Story:** As a Likelee user, I want to view a trail of recent login events on my account, so that I can audit when and from where my account has been accessed.

#### Acceptance Criteria

1. WHEN a user views the login history section, THE SessionAuditHook SHALL fetch login history from `GET /api/auth/login-history` and expose the events to the ActiveSessionAudit component.
2. WHEN login history events are displayed, THE ActiveSessionAudit component SHALL show the event type, timestamp, IP address, and device label for each event.
3. WHEN login history is displayed, THE ActiveSessionAudit component SHALL order events by `created_at` descending and cap the displayed list at 50 events per request.
4. THE SessionsHandler SHALL expose the login history endpoint as a read-only GET endpoint with no mutation capability.
5. WHERE a `limit` query parameter is provided, THE SessionsHandler SHALL cap the returned event count at the specified value up to a maximum of 100.

---

### Requirement 6: Backend Session Endpoints

**User Story:** As a system, I need secure backend endpoints that proxy session management operations to the Supabase Admin API, so that the service key is never exposed to the frontend.

#### Acceptance Criteria

1. THE Backend SHALL expose `GET /api/auth/sessions` to return all active sessions for the authenticated user, including a `current_session_id` field.
2. THE Backend SHALL expose `DELETE /api/auth/sessions/:session_id` to revoke a specific session belonging to the authenticated user.
3. THE Backend SHALL expose `DELETE /api/auth/sessions` to revoke all sessions except the CurrentSession for the authenticated user.
4. THE Backend SHALL expose `GET /api/auth/login-history` to return paginated login history events for the authenticated user.
5. THE SessionsHandler SHALL validate the JWT on every request using the existing `AuthUser` extractor before executing any session operation.
6. THE SessionsHandler SHALL verify that the target session belongs to the authenticated user by checking session membership before calling the Supabase Admin API.
7. THE Backend SHALL never include the Supabase service key in any HTTP response body or header.
8. IF the Supabase Admin API is unavailable, THEN THE SessionsHandler SHALL return HTTP 502 with error code `"session_service_unavailable"`.
9. IF a DELETE request targets a session ID that no longer exists (Supabase returns 404), THEN THE SessionsHandler SHALL treat the response as success and return HTTP 200 with `{ "success": true }`.

---

### Requirement 7: User-Agent Parsing

**User Story:** As a Likelee user, I want to see human-readable device and browser labels for each session, so that I can easily identify which device each session belongs to.

#### Acceptance Criteria

1. WHEN a raw user-agent string is parsed, THE UAParser SHALL return a non-empty `device_label` string for any input, including empty strings and unrecognized formats, falling back to `"Unknown Device"`.
2. WHEN a raw user-agent string is parsed, THE UAParser SHALL return a `device_type` value that is one of `"desktop"`, `"mobile"`, `"tablet"`, or `"unknown"`.
3. THE UAParser SHALL have no side effects and produce deterministic output for the same input.
4. WHEN the JWT does not contain a `sid` claim, THE SessionsHandler SHALL fall back to best-effort session matching using `user_agent` and `created_at` proximity, log a server-side warning, and set `is_current` to `false` for all sessions if no match is found.

---

### Requirement 8: Current Session Identification

**User Story:** As a Likelee user, I want my current session to be clearly identified in the session list, so that I know which session I am currently using and cannot accidentally revoke it.

#### Acceptance Criteria

1. WHEN the Backend processes `GET /api/auth/sessions`, THE SessionsHandler SHALL identify the CurrentSession by matching the `sid` claim from the caller's JWT against the `id` field of each session returned by the Supabase Admin API.
2. THE SessionsHandler SHALL set `is_current: true` on exactly the session whose `id` matches the JWT `sid` claim, and `is_current: false` on all other sessions.
3. IF no session matches the JWT `sid` claim, THEN THE SessionsHandler SHALL return all sessions with `is_current: false` and log a server-side warning.
4. THE SessionsHandler SHALL include a `current_session_id` field in the `ListSessionsResponse` payload.

---

### Requirement 9: Data Model Integrity

**User Story:** As a developer, I want well-defined and validated data models for sessions and login events, so that the frontend and backend can exchange data reliably.

#### Acceptance Criteria

1. THE Backend SHALL return `SessionInfo` objects where `id` is a non-empty UUID string, `created_at` and `last_active_at` are valid ISO 8601 timestamps, `device_label` is a non-empty string, and `device_type` is one of the four valid values.
2. THE Backend SHALL return `LoginEvent` objects where `id` is a non-empty string, `event_type` is one of `"login"`, `"logout"`, `"token_refreshed"`, or `"mfa_verified"`, and `created_at` is a valid ISO 8601 timestamp.
3. THE Backend SHALL return a `ListSessionsResponse` containing a `sessions` array and a `current_session_id` string.
4. THE Backend SHALL return a `LoginHistoryResponse` containing an `events` array and a `total` integer.
