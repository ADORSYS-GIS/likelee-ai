import React from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  HelpCircle,
  Loader2,
  MapPin,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SessionInfo } from "@/api/sessions";

interface SessionCardProps {
  session: SessionInfo;
  isCurrent: boolean;
  onRevoke: (sessionId: string) => void;
  isRevoking: boolean;
}

function DeviceIcon({ type }: { type: string }) {
  const cls = "w-5 h-5 text-gray-500 shrink-0";
  switch (type) {
    case "mobile":
      return <Smartphone className={cls} />;
    case "tablet":
      return <Tablet className={cls} />;
    case "desktop":
      return <Monitor className={cls} />;
    default:
      return <HelpCircle className={cls} />;
  }
}

function formatRelativeTime(iso: string): string {
  if (!iso) return "Unknown";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

export function SessionCard({
  session,
  isCurrent,
  onRevoke,
  isRevoking,
}: SessionCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-none bg-white hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <DeviceIcon type={session.device_type} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-widest text-gray-900 truncate">
              {session.device_label}
            </span>
            {isCurrent && (
              <Badge className="bg-gray-900 text-white font-black uppercase tracking-widest text-[9px] rounded-none px-2 py-0.5 shrink-0">
                This device
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {session.ip_address && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                <MapPin className="w-3 h-3" />
                {session.ip_address}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(session.last_active_at)}
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={isCurrent || isRevoking}
        onClick={() => onRevoke(session.id)}
        className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 font-black uppercase tracking-widest text-[9px] rounded-none disabled:opacity-30"
      >
        {isRevoking ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isCurrent ? (
          "Active"
        ) : (
          "Revoke"
        )}
      </Button>
    </div>
  );
}
