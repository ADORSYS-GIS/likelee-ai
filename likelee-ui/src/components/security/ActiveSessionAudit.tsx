import React, { useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LogOut,
  History,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSessionAudit } from "@/hooks/useSessionAudit";
import { SessionCard } from "./SessionCard";

interface ActiveSessionAuditProps {
  variant?: "brand" | "agency" | "creator";
}

function formatEventType(type: string): string {
  switch (type) {
    case "login":
      return "Signed in";
    case "logout":
      return "Signed out";
    case "token_refreshed":
      return "Session refreshed";
    case "mfa_verified":
      return "MFA verified";
    default:
      return type.replace(/_/g, " ");
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ActiveSessionAudit({ variant: _variant = "brand" }: ActiveSessionAuditProps) {
  const { toast } = useToast();
  const {
    sessions,
    loginHistory,
    currentSessionId,
    isLoading,
    isRevoking,
    error,
    revokeSession,
    revokeAllOtherSessions,
    refresh,
  } = useSessionAudit();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const otherSessionCount = sessions.filter((s) => s.id !== currentSessionId).length;

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      toast({ title: "Session revoked", description: "The device has been signed out." });
    } catch (err: any) {
      toast({
        title: "Failed to revoke session",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setShowConfirm(false);
    try {
      await revokeAllOtherSessions();
      toast({
        title: "All other sessions signed out",
        description: `${otherSessionCount} device${otherSessionCount !== 1 ? "s" : ""} signed out.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to sign out other sessions",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
          Active Sessions
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="text-gray-400 hover:text-gray-700 rounded-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            {error}
            <button
              onClick={refresh}
              className="ml-2 underline font-black"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && !error && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-none" />
          ))}
        </div>
      )}

      {/* Session list */}
      {!isLoading && !error && (
        <>
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400 font-medium py-4 text-center">
              No active sessions found.
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isCurrent={session.id === currentSessionId}
                  onRevoke={handleRevoke}
                  isRevoking={isRevoking && revokingId === session.id}
                />
              ))}
            </div>
          )}

          {/* Sign out all other devices */}
          {otherSessionCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={isRevoking}
              className="w-full rounded-none border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 font-black uppercase tracking-widest text-[10px] h-10"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign out all other devices ({otherSessionCount})
            </Button>
          )}
        </>
      )}

      {/* Login history collapsible */}
      {!isLoading && !error && loginHistory.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors w-full"
          >
            <History className="w-3.5 h-3.5" />
            Login History ({loginHistory.length})
            {showHistory ? (
              <ChevronUp className="w-3.5 h-3.5 ml-auto" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            )}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
              {loginHistory.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">
                      {formatEventType(event.event_type)}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium truncate">
                      {event.device_label}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="flex items-center gap-1 text-[10px] text-gray-400 font-medium justify-end">
                      <Clock className="w-3 h-3" />
                      {formatDate(event.created_at)}
                    </p>
                    {event.ip_address && (
                      <p className="flex items-center gap-1 text-[10px] text-gray-300 font-medium justify-end">
                        <MapPin className="w-3 h-3" />
                        {event.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">
              Sign out all other devices?
            </DialogTitle>
            <DialogDescription>
              This will immediately revoke{" "}
              <strong>{otherSessionCount} other session{otherSessionCount !== 1 ? "s" : ""}</strong>.
              Anyone using your account on those devices will be signed out.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="rounded-none font-black uppercase tracking-widest text-[10px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevokeAll}
              className="rounded-none bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-700"
            >
              Sign out {otherSessionCount} device{otherSessionCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
