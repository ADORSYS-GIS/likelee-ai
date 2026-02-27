import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  acceptAgencyTalentInviteByToken,
  declineAgencyTalentInviteByToken,
  getAgencyTalentInviteByToken,
  getAgencyTalentInviteMagicLinkByToken,
} from "@/api/functions";

const INVITE_INTENT_KEY = "likelee_invite_intent";
const INVITE_INTENT_TOKEN_KEY = "likelee_invite_token";
const INVITE_INTENT_TS_KEY = "likelee_invite_intent_ts";
const INVITE_INTENT_ACCEPT = "accept";
const INVITE_INTENT_TTL_MS = 1000 * 60 * 30;

export default function AgencyInviteLanding() {
  const { token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated, profile, user, supabase } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [invite, setInvite] = React.useState<any>(null);
  const [hasAcceptIntent, setHasAcceptIntent] = React.useState(false);
  const [autoFinalizeError, setAutoFinalizeError] = React.useState<
    string | null
  >(null);
  const autoFinalizeRef = React.useRef(false);

  const effectiveToken = String(token || "").trim();

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!effectiveToken) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res: any = await getAgencyTalentInviteByToken(effectiveToken);
        const inv = res?.invite;
        if (!active) return;
        setInvite(inv || null);
      } catch (e: any) {
        if (!active) return;
        setInvite(null);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [effectiveToken]);

  const email = String(invite?.email || "");
  const agencyName =
    invite?.agencies?.agency_name || invite?.agency_name || "Agency";
  const agencyLogoUrl = invite?.agencies?.logo_url || invite?.agency_logo_url;
  const status = String(invite?.status || "");
  const signedInEmail = String(user?.email || profile?.email || "")
    .trim()
    .toLowerCase();
  const inviteEmail = email.trim().toLowerCase();
  const emailMatchesInvite = !!inviteEmail && signedInEmail === inviteEmail;
  const effectiveRole = String(
    profile?.role || user?.user_metadata?.role || "",
  ).toLowerCase();
  const hasInviteRole =
    effectiveRole === "creator" || effectiveRole === "talent";

  const isPending = status === "pending";

  const readAcceptIntent = React.useCallback(() => {
    const params = new URLSearchParams(location.search);
    const urlIntent = params.get("intent");
    if (urlIntent === INVITE_INTENT_ACCEPT) return true;
    try {
      const intent = localStorage.getItem(INVITE_INTENT_KEY) || "";
      const storedToken = localStorage.getItem(INVITE_INTENT_TOKEN_KEY) || "";
      const ts = Number(localStorage.getItem(INVITE_INTENT_TS_KEY) || "0");
      const fresh = ts > 0 && Date.now() - ts < INVITE_INTENT_TTL_MS;
      return (
        fresh &&
        intent === INVITE_INTENT_ACCEPT &&
        storedToken === effectiveToken
      );
    } catch {
      return false;
    }
  }, [effectiveToken, location.search]);

  const clearAcceptIntent = React.useCallback(() => {
    try {
      localStorage.removeItem(INVITE_INTENT_KEY);
      localStorage.removeItem(INVITE_INTENT_TOKEN_KEY);
      localStorage.removeItem(INVITE_INTENT_TS_KEY);
    } catch {
      // ignore
    }
    setHasAcceptIntent(false);
  }, []);

  const startMagicLinkFlow = async () => {
    if (!effectiveToken) return;
    setActionLoading(true);
    setAutoFinalizeError(null);
    try {
      try {
        localStorage.setItem(
          "likelee_invite_next",
          `/invite/agency/${encodeURIComponent(effectiveToken)}?intent=accept`,
        );
        localStorage.setItem("likelee_invite_next_ts", String(Date.now()));
        localStorage.setItem(INVITE_INTENT_KEY, INVITE_INTENT_ACCEPT);
        localStorage.setItem(INVITE_INTENT_TOKEN_KEY, effectiveToken);
        localStorage.setItem(INVITE_INTENT_TS_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      setHasAcceptIntent(true);

      const res: any =
        await getAgencyTalentInviteMagicLinkByToken(effectiveToken);
      const link = String(res?.action_link || "");
      if (!link.startsWith("http")) {
        throw new Error("Missing action link");
      }
      window.location.href = link;
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Could not start invite",
        description: e?.message || String(e),
      });
    } finally {
      setActionLoading(false);
    }
  };

  React.useEffect(() => {
    setHasAcceptIntent(readAcceptIntent());
  }, [readAcceptIntent, loading, authenticated]);

  React.useEffect(() => {
    if (!isPending && hasAcceptIntent) {
      clearAcceptIntent();
    }
  }, [isPending, hasAcceptIntent, clearAcceptIntent]);

  React.useEffect(() => {
    if (
      !authenticated ||
      !isPending ||
      !hasInviteRole ||
      !emailMatchesInvite ||
      !hasAcceptIntent
    ) {
      return;
    }
    if (autoFinalizeRef.current) return;
    autoFinalizeRef.current = true;
    setAutoFinalizeError(null);
    setActionLoading(true);

    (async () => {
      try {
        await acceptAgencyTalentInviteByToken(effectiveToken);
        clearAcceptIntent();
        toast({
          title: "Invitation accepted",
          description: "Welcome! Redirecting you to the Talent Portal…",
        });
        navigate("/talentportal", { replace: true });
      } catch (e: any) {
        autoFinalizeRef.current = false;
        setAutoFinalizeError(e?.message || String(e));
        toast({
          variant: "destructive",
          title: "Could not complete invite acceptance",
          description: e?.message || String(e),
        });
      } finally {
        setActionLoading(false);
      }
    })();
  }, [
    authenticated,
    isPending,
    hasInviteRole,
    emailMatchesInvite,
    hasAcceptIntent,
    effectiveToken,
    navigate,
    clearAcceptIntent,
  ]);

  const completeAcceptance = React.useCallback(async () => {
    if (!effectiveToken) return;
    setActionLoading(true);
    setAutoFinalizeError(null);
    try {
      await acceptAgencyTalentInviteByToken(effectiveToken);
      clearAcceptIntent();
      toast({
        title: "Invitation accepted",
        description: "Welcome! Redirecting you to the Talent Portal…",
      });
      navigate("/talentportal", { replace: true });
    } catch (e: any) {
      setAutoFinalizeError(e?.message || String(e));
      toast({
        variant: "destructive",
        title: "Could not complete invite acceptance",
        description: e?.message || String(e),
      });
    } finally {
      setActionLoading(false);
    }
  }, [clearAcceptIntent, effectiveToken, navigate]);

  const declineInvite = async () => {
    if (!effectiveToken) return;
    setActionLoading(true);
    try {
      await declineAgencyTalentInviteByToken(effectiveToken);
      await supabase?.auth.signOut();
      toast({
        title: "Invitation declined",
        description: "You declined the invitation.",
      });
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Could not decline",
        description: e?.message || String(e),
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading invitation…
        </div>
      </div>
    );
  }

  if (!effectiveToken || !invite) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <Card className="p-6">
          <div className="text-lg font-semibold text-gray-900">
            Invalid invite
          </div>
          <div className="text-sm text-gray-600 mt-1">
            This invitation link is invalid or no longer available.
          </div>
          <Button className="mt-5" onClick={() => navigate("/")}>
            Go to homepage
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
            {agencyLogoUrl ? (
              <img
                src={agencyLogoUrl}
                alt={agencyName}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-sm font-bold text-gray-600">
                {(String(agencyName).trim()[0] || "A").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-gray-900 truncate">
              Join {agencyName}
            </div>
            <div className="text-sm text-gray-600 truncate">
              Invitation for {email || "your email"}
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-700">
          Accept this invitation to continue. You will then set your password
          and be redirected directly to the Talent Portal.
        </div>

        {!authenticated ? (
          <div className="mt-6">
            <Button
              className="w-full h-11"
              disabled={!isPending || actionLoading}
              onClick={async () => {
                await startMagicLinkFlow();
              }}
            >
              {actionLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting…
                </span>
              ) : (
                "Accept & Continue"
              )}
            </Button>

            <div className="mt-3 text-xs text-gray-500">
              You’ll be redirected to set your password. After that, acceptance
              is completed automatically.
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {hasAcceptIntent && isPending && hasInviteRole && emailMatchesInvite ? (
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                <div className="inline-flex items-center gap-2 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finalizing your acceptance...
                </div>
                {autoFinalizeError && (
                  <div className="mt-2 text-xs text-red-700">
                    {autoFinalizeError}
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  className="w-full h-11 bg-[#32C8D1] hover:bg-[#2AB8C1]"
                  disabled={!isPending || actionLoading}
                  onClick={async () => {
                    if (authenticated && hasInviteRole && emailMatchesInvite) {
                      await completeAcceptance();
                      return;
                    }
                    await startMagicLinkFlow();
                  }}
                >
                  {actionLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting…
                    </span>
                  ) : (
                    "Accept & Continue"
                  )}
                </Button>
                <div className="text-xs text-gray-500">
                  You’ll be redirected to set your password. After that,
                  acceptance is completed automatically.
                </div>
                {authenticated && (!hasInviteRole || !emailMatchesInvite) && (
                  <div className="text-xs text-amber-700">
                    Continue with the invited account ({email || "invite email"}
                    ) to finish acceptance.
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full h-11"
                  disabled={
                    !isPending ||
                    actionLoading ||
                    !hasInviteRole ||
                    !emailMatchesInvite
                  }
                  onClick={declineInvite}
                >
                  Decline
                </Button>
              </>
            )}

            <div className="text-xs text-gray-500">
              Signed in as {user?.email || profile?.email || ""}
            </div>
          </div>
        )}

        {!isPending && (
          <div className="mt-6 text-sm text-gray-600">
            This invitation is {status || "not available"}.
          </div>
        )}
      </Card>
    </div>
  );
}
