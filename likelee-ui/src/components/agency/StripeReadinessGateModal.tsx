/**
 * StripeReadinessGateModal
 *
 * Pre-flight modal shown when an agency clicks "Send Contract".
 * Enforces a two-tier gate:
 *
 *   HARD BLOCK  — at least one party (agency or talent) has no Stripe account
 *                 connected at all. Contract cannot be sent until resolved.
 *
 *   SOFT WARNING — all parties are connected but one or more have
 *                  transfers_enabled = false (Stripe onboarding incomplete).
 *                  Agency may still send; transfers can be retried later.
 *
 * Also exports ContractPrecheckModal — a polished replacement for the generic
 * sendPrecheckOpen dialog used for "no talents assigned" and fallback checks.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  ArrowRight,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ---------------------------------------------------------------------------
// Types (mirror the backend OfferStripeReadinessResponse shape)
// ---------------------------------------------------------------------------

export interface StripeReadinessParty {
  party_type: "agency" | "creator";
  id: string;
  name: string;
  connected: boolean;
  transfers_enabled: boolean;
  details_submitted: boolean;
}

export interface OfferStripeReadiness {
  offer_id: string;
  agency: StripeReadinessParty;
  talents: StripeReadinessParty[];
  all_connected: boolean;
  all_transfers_enabled: boolean;
}

// ---------------------------------------------------------------------------
// Gate type derived from readiness data
// ---------------------------------------------------------------------------

export type ReadinessGate =
  | "ok" // all connected + all transfers enabled → no modal needed
  | "hard_block" // ≥1 party not connected → cannot send
  | "soft_warning"; // all connected, but ≥1 transfers disabled → can send with warning

export function deriveGate(data: OfferStripeReadiness): ReadinessGate {
  if (data.all_connected && data.all_transfers_enabled) return "ok";
  if (!data.all_connected) return "hard_block";
  return "soft_warning";
}

// ---------------------------------------------------------------------------
// PartyRow — single row in the party list
// ---------------------------------------------------------------------------

function PartyStatusPill({
  connected,
  transfers_enabled,
}: {
  connected: boolean;
  transfers_enabled: boolean;
}) {
  if (!connected) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        <ShieldX className="w-3 h-3" />
        Not connected
      </span>
    );
  }
  if (!transfers_enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        <ShieldAlert className="w-3 h-3" />
        Transfers disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <ShieldCheck className="w-3 h-3" />
      Ready
    </span>
  );
}

function PartyRow({
  party,
  onMessage,
}: {
  party: StripeReadinessParty;
  onMessage?: (party: StripeReadinessParty) => void;
}) {
  const roleLabel = party.party_type === "agency" ? "Agency" : "Talent";
  const initials = party.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const canMessage =
    onMessage && party.party_type === "creator" && !party.connected;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-600">
        {initials || <Users className="w-4 h-4 text-gray-400" />}
      </div>
      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {party.name}
        </p>
        <p className="text-xs text-gray-400 leading-tight">{roleLabel}</p>
      </div>
      {/* Message shortcut — only for unconnected talents */}
      {canMessage && (
        <button
          onClick={() => onMessage(party)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
          title={`Message ${party.name}`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      )}
      {/* Status pill */}
      <PartyStatusPill
        connected={party.connected}
        transfers_enabled={party.transfers_enabled}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StripeReadinessGateModal — hard block or soft warning
// ---------------------------------------------------------------------------

interface StripeReadinessGateModalProps {
  open: boolean;
  gate: ReadinessGate;
  readiness: OfferStripeReadiness | null;
  onSendAnyway: () => void;
  onClose: () => void;
}

export function StripeReadinessGateModal({
  open,
  gate,
  readiness,
  onSendAnyway,
  onClose,
}: StripeReadinessGateModalProps) {
  const navigate = useNavigate();

  if (!readiness || gate === "ok") return null;

  const allParties: StripeReadinessParty[] = [
    readiness.agency,
    ...readiness.talents,
  ];
  const unconnectedParties = allParties.filter((p) => !p.connected);
  const transferDisabledParties = allParties.filter(
    (p) => p.connected && !p.transfers_enabled,
  );
  const agencyUnconnected = !readiness.agency.connected;

  // ── HARD BLOCK ─────────────────────────────────────────────────────────────
  if (gate === "hard_block") {
    // Unconnected talents (not the agency) — these are the ones to message
    const unconnectedTalents = unconnectedParties.filter(
      (p) => p.party_type === "creator",
    );

    const handleMessageParty = (party: StripeReadinessParty) => {
      onClose();
      // creator_id is stored in party.id — openCreatorId pre-opens the conversation
      navigate(
        `/AgencyDashboard?tab=messages&openCreatorId=${encodeURIComponent(party.id)}`,
      );
    };

    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden gap-0">
          {/* Header band */}
          <div className="bg-gradient-to-br from-red-600 to-rose-700 px-6 pt-8 pb-6 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
              <ShieldX className="w-6 h-6 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white leading-snug">
                Stripe account required
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-red-100 mt-1 leading-relaxed">
              {unconnectedParties.length === 1
                ? "1 party hasn't connected a Stripe account yet."
                : `${unconnectedParties.length} parties haven't connected Stripe accounts yet.`}{" "}
              The contract cannot be sent until this is resolved.
            </p>
          </div>

          {/* Party list */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Payout readiness
            </p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 divide-y divide-gray-100">
              {allParties.map((p) => (
                <PartyRow
                  key={p.id}
                  party={p}
                  onMessage={
                    unconnectedTalents.length > 0
                      ? handleMessageParty
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="px-6 pb-2">
            <p className="text-xs text-gray-500 leading-relaxed">
              Ask {unconnectedParties.map((p) => p.name).join(", ")} to go to
              their <span className="font-semibold text-gray-700">Payouts</span>{" "}
              section and complete Stripe onboarding. Once connected, you can
              send this contract.{" "}
              {unconnectedTalents.length > 0 && (
                <span>
                  Use the{" "}
                  <MessageSquare className="w-3 h-3 inline-block -mt-0.5 text-blue-500" />{" "}
                  icon next to each talent to message them directly.
                </span>
              )}
            </p>
          </div>

          <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2">
            {agencyUnconnected && (
              <Button
                variant="outline"
                className="gap-2 border-gray-300"
                onClick={() => {
                  onClose();
                  navigate("/AgencyDashboard?tab=payouts");
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Go to Payouts
              </Button>
            )}
            {unconnectedTalents.length === 1 && (
              <Button
                variant="outline"
                className="gap-2 border-gray-300"
                onClick={() => handleMessageParty(unconnectedTalents[0])}
              >
                <MessageSquare className="w-4 h-4" />
                Message {unconnectedTalents[0].name}
              </Button>
            )}
            {unconnectedTalents.length > 1 && (
              <Button
                variant="outline"
                className="gap-2 border-gray-300"
                onClick={() => {
                  onClose();
                  navigate("/AgencyDashboard?tab=messages");
                }}
              >
                <MessageSquare className="w-4 h-4" />
                Go to Messages
              </Button>
            )}
            <Button
              onClick={onClose}
              className="bg-gray-900 hover:bg-gray-800 text-white gap-2"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── SOFT WARNING ───────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden gap-0">
        {/* Header band */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 px-6 pt-8 pb-6 text-white">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white leading-snug">
              Transfers not fully enabled
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-100 mt-1 leading-relaxed">
            All parties have Stripe accounts, but{" "}
            {transferDisabledParties.length === 1
              ? "1 account hasn't"
              : `${transferDisabledParties.length} accounts haven't`}{" "}
            completed Stripe onboarding yet.
          </p>
        </div>

        {/* Party list */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Payout readiness
          </p>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 divide-y divide-gray-100">
            {allParties.map((p) => (
              <PartyRow key={p.id} party={p} />
            ))}
          </div>
        </div>

        {/* Info callout */}
        <div className="mx-6 mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3.5">
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">
              You can still send this contract.
            </span>{" "}
            The brand will be able to pay and funds will be held in escrow. Once
            the affected{" "}
            {transferDisabledParties.length === 1
              ? "party completes"
              : "parties complete"}{" "}
            Stripe onboarding, you can retry the escrow release from the
            Deliverables tab.
          </p>
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            className="gap-2 border-gray-300"
            onClick={() => {
              onClose();
              navigate("/AgencyDashboard?tab=payouts");
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Go to Payouts
          </Button>
          <Button
            variant="outline"
            className="border-gray-300"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose();
              onSendAnyway();
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white gap-2"
          >
            Send anyway
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ContractPrecheckModal — polished replacement for the generic sendPrecheckOpen
// dialog used for "no talents assigned" and fallback stripe checks.
// ---------------------------------------------------------------------------

export interface ContractPrecheckAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  icon?: React.ReactNode;
}

export interface ContractPrecheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "block" = red header, "warning" = amber header, "info" = blue header */
  severity?: "block" | "warning" | "info";
  title: string;
  description: string;
  /** Optional extra body content rendered below the description */
  body?: React.ReactNode;
  actions: ContractPrecheckAction[];
}

const severityConfig = {
  block: {
    gradient: "from-red-600 to-rose-700",
    icon: <ShieldX className="w-6 h-6 text-white" />,
    subtextColor: "text-red-100",
  },
  warning: {
    gradient: "from-amber-500 to-orange-500",
    icon: <AlertTriangle className="w-6 h-6 text-white" />,
    subtextColor: "text-amber-100",
  },
  info: {
    gradient: "from-blue-600 to-indigo-600",
    icon: <AlertCircle className="w-6 h-6 text-white" />,
    subtextColor: "text-blue-100",
  },
};

export function ContractPrecheckModal({
  open,
  onOpenChange,
  severity = "warning",
  title,
  description,
  body,
  actions,
}: ContractPrecheckModalProps) {
  const cfg = severityConfig[severity];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0">
        {/* Header band */}
        <div
          className={`bg-gradient-to-br ${cfg.gradient} px-6 pt-8 pb-6 text-white`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            {cfg.icon}
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white leading-snug">
              {title}
            </DialogTitle>
          </DialogHeader>
          <p className={`text-sm ${cfg.subtextColor} mt-1 leading-relaxed`}>
            {description}
          </p>
        </div>

        {/* Optional extra body */}
        {body && (
          <div className="px-6 py-4 text-sm text-gray-600 leading-relaxed">
            {body}
          </div>
        )}

        <DialogFooter
          className={`px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2 ${
            body ? "" : "mt-0"
          }`}
        >
          {actions.map((a, idx) => (
            <Button
              key={`${a.label}-${idx}`}
              variant={
                a.variant === "outline"
                  ? "outline"
                  : a.variant === "destructive"
                    ? "destructive"
                    : "default"
              }
              onClick={a.onClick}
              className={
                a.variant !== "outline" && a.variant !== "destructive"
                  ? "bg-gray-900 hover:bg-gray-800 text-white gap-2"
                  : "border-gray-300 gap-2"
              }
            >
              {a.icon}
              {a.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
