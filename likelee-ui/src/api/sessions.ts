import { base44 as base44Client } from "./base44Client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  created_at: string;
  last_active_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string;
  device_type: "desktop" | "mobile" | "tablet" | "unknown";
  is_current: boolean;
}

export interface LoginEvent {
  id: string;
  event_type: "login" | "logout" | "token_refreshed" | "mfa_verified";
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string;
}

export interface ListSessionsResponse {
  sessions: SessionInfo[];
  current_session_id: string | null;
}

export interface LoginHistoryResponse {
  events: LoginEvent[];
  total: number;
}

export interface RevokeAllResponse {
  revoked_count: number;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export const listSessions = () =>
  base44Client.get<ListSessionsResponse>("/api/auth/sessions");

export const revokeSession = (sessionId: string) =>
  base44Client.delete(`/api/auth/sessions/${sessionId}`);

export const revokeAllOtherSessions = () =>
  base44Client.delete<RevokeAllResponse>("/api/auth/sessions");

export const getLoginHistory = (params?: { limit?: number }) =>
  base44Client.get<LoginHistoryResponse>("/api/auth/login-history", { params });
