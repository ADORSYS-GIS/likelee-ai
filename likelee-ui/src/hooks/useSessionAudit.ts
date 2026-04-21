import { useState, useEffect, useCallback } from "react";
import {
  listSessions,
  revokeSession as apiRevokeSession,
  revokeAllOtherSessions as apiRevokeAll,
  getLoginHistory,
  SessionInfo,
  LoginEvent,
} from "@/api/sessions";

export interface UseSessionAuditReturn {
  sessions: SessionInfo[];
  loginHistory: LoginEvent[];
  currentSessionId: string | null;
  isLoading: boolean;
  isRevoking: boolean;
  error: string | null;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
  refresh: () => void;
}

export function useSessionAudit(): UseSessionAuditReturn {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([listSessions(), getLoginHistory({ limit: 50 })])
      .then(([sessionsRes, historyRes]) => {
        if (cancelled) return;
        setSessions(sessionsRes.sessions ?? []);
        setCurrentSessionId(sessionsRes.current_session_id ?? null);
        setLoginHistory(historyRes.events ?? []);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(
          err?.message || "Failed to load session data. Please try again."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const revokeSession = useCallback(
    async (sessionId: string) => {
      setIsRevoking(true);
      try {
        await apiRevokeSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } finally {
        setIsRevoking(false);
      }
    },
    []
  );

  const revokeAllOtherSessions = useCallback(async () => {
    setIsRevoking(true);
    try {
      await apiRevokeAll();
      // Keep only the current session in the list
      setSessions((prev) =>
        prev.filter((s) => s.id === currentSessionId)
      );
    } finally {
      setIsRevoking(false);
    }
  }, [currentSessionId]);

  return {
    sessions,
    loginHistory,
    currentSessionId,
    isLoading,
    isRevoking,
    error,
    revokeSession,
    revokeAllOtherSessions,
    refresh,
  };
}
