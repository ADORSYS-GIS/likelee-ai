import React from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function AgencyInviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { authenticated, profile, supabase } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [invite, setInvite] = React.useState<any>(null);

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
  const effectiveRole = String(profile?.role || "").toLowerCase();
  const hasInviteRole = effectiveRole === "creator" || effectiveRole === "talent";

  const startMagicLinkFlow = async () => {
    if (!effectiveToken) return;
    setActionLoading(true);
    try {
      const res: any = await getAgencyTalentInviteMagicLinkByToken(effectiveToken);
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

  const acceptInvite = async () => {
    if (!effectiveToken) return;
    setActionLoading(true);
    try {
      await acceptAgencyTalentInviteByToken(effectiveToken);
      toast({
        title: "Invitation accepted",
        description: "Welcome! Redirecting you to the Talent Portal…",
      });
      navigate("/talentportal", { replace: true });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Could not accept",
        description: e?.message || String(e),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const declineInvite = async () => {
    if (!effectiveToken) return;
    setActionLoading(true);
    try {
      await declineAgencyTalentInviteByToken(effectiveToken);
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
          <div className="text-lg font-semibold text-gray-900">Invalid invite</div>
          <div className="text-sm text-gray-600 mt-1">
            This invitation link is invalid or no longer available.
          </div>
          <Button className="mt-5" onClick={() => navigate("/")}
            >Go to homepage</Button>
        </Card>
      </div>
    );
  }

  const isPending = status === "pending";

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
          To access the Talent Portal, you need to set a password and accept the
          invitation.
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
                "Set password"
              )}
            </Button>

            <div className="mt-3 text-xs text-gray-500">
              You’ll be redirected to set your password. After that, you’ll
              come back here to accept or decline.
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {!hasInviteRole && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                You’re signed in as <span className="font-semibold">{effectiveRole || "unknown"}</span>.
                To accept this portal invite, please sign in as a <span className="font-semibold">Creator (Face/Talent)</span>
                with <span className="font-semibold">{email}</span>.
                <div className="mt-3">
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={actionLoading}
                    onClick={async () => {
                      try {
                        await supabase?.auth.signOut();
                        toast({
                          title: "Signed out",
                          description: "Now set your password / log in with the invited email.",
                        });
                      } catch (e: any) {
                        toast({
                          variant: "destructive",
                          title: "Could not sign out",
                          description: e?.message || String(e),
                        });
                      }
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </div>
            )}
            <Button
              className="w-full h-11 bg-[#32C8D1] hover:bg-[#2AB8C1]"
              disabled={!isPending || actionLoading || !hasInviteRole}
              onClick={acceptInvite}
            >
              {actionLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </span>
              ) : (
                "Accept invitation"
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11"
              disabled={!isPending || actionLoading || !hasInviteRole}
              onClick={declineInvite}
            >
              Decline
            </Button>

            <div className="text-xs text-gray-500">
              Signed in as {profile?.email || ""}
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
