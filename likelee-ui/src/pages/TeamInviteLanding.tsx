import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { EmailOtpDialog } from "@/components/auth/EmailOtpDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  acceptTeamInviteByToken,
  declineTeamInviteByToken,
  getTeamInviteByToken,
} from "@/api/functions";
import type { EmailOtpPurpose } from "@/lib/emailOtp";
import {
  normalizeEmail,
  resendSignupEmailOtp,
  sendExistingUserEmailOtp,
  verifyEmailOtpCode,
} from "@/lib/emailOtp";

type InvitePayload = {
  id: string;
  organization_type: "agency" | "brand";
  organization_id: string;
  organization_name: string;
  email: string;
  role: string;
  status: string;
  expires_at?: string;
};

function dashboardForOrganization(type: "agency" | "brand") {
  return type === "brand" ? "/BrandDashboard" : "/AgencyDashboard";
}

export default function TeamInviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { authenticated, profile, supabase, refreshProfile } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [invite, setInvite] = React.useState<InvitePayload | null>(null);
  const [otpDialogOpen, setOtpDialogOpen] = React.useState(false);
  const [otpPurpose, setOtpPurpose] = React.useState<EmailOtpPurpose>("signin");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);

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
        const res: any = await getTeamInviteByToken(effectiveToken);
        if (!active) return;
        setInvite((res?.invite as InvitePayload) || null);
      } catch {
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

  const email = normalizeEmail(String(invite?.email || ""));
  const organizationName = invite?.organization_name || "Organization";
  const organizationType = invite?.organization_type || "agency";
  const membershipRole = String(invite?.role || "").replaceAll("_", " ");
  const signedInEmail = normalizeEmail(String(profile?.email || ""));
  const effectiveRole = String(profile?.role || "").toLowerCase();
  const emailMatchesInvite = !!email && signedInEmail === email;
  const roleMatchesInvite = effectiveRole === organizationType;
  const canRespondDirectly =
    authenticated && emailMatchesInvite && roleMatchesInvite;
  const isPending = String(invite?.status || "") === "pending";

  const requireSupabase = () => {
    if (!supabase) throw new Error("Supabase not configured");
    return supabase;
  };

  const completeInviteAcceptance = React.useCallback(async () => {
    if (!effectiveToken || !invite) return;
    setActionLoading(true);
    setActionError(null);
    try {
      console.log("[TeamInviteLanding] Accepting invitation...");
      await acceptTeamInviteByToken(effectiveToken);
      
      console.log("[TeamInviteLanding] Invitation accepted by backend, waiting for database replication...");
      // Wait for database replication/cache invalidation to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("[TeamInviteLanding] Refreshing profile...");
      await refreshProfile();
      
      console.log("[TeamInviteLanding] Profile refresh complete, navigating to dashboard");
      
      setOtpDialogOpen(false);
      setPassword("");
      setConfirmPassword("");
      toast({
        title: "Invitation accepted",
        description: `Redirecting you to ${organizationName}…`,
      });
      
      navigate(dashboardForOrganization(invite.organization_type), {
        replace: true,
      });
    } catch (e: any) {
      const message = e?.message || String(e);
      setActionError(message);
      toast({
        variant: "destructive",
        title: "Could not complete invite acceptance",
        description: message,
      });
    } finally {
      setActionLoading(false);
    }
  }, [effectiveToken, invite, navigate, organizationName, refreshProfile]);

  const handleOtpVerify = async (code: string) => {
    const client = requireSupabase();
    await verifyEmailOtpCode(client, {
      email,
      token: code,
      purpose: otpPurpose,
    });
    toast({
      title: "Email verified",
      description: "Finalizing your team invitation on this tab…",
    });
    await completeInviteAcceptance();
  };

  const handleOtpResend = async () => {
    const client = requireSupabase();
    if (otpPurpose === "signup") {
      await resendSignupEmailOtp(client, email);
    } else {
      await sendExistingUserEmailOtp(client, email);
    }
    toast({
      title: "Code sent",
      description: "We sent a fresh 6-digit code to your email address.",
    });
  };

  const startInviteFlow = async () => {
    if (!invite || !effectiveToken || !isPending) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (canRespondDirectly) {
        await completeInviteAcceptance();
        return;
      }

      const client = requireSupabase();
      if (!password) {
        throw new Error("Create a password to continue.");
      }
      if (password.length < 6) {
        throw new Error("Password should be at least 6 characters.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: invite.organization_type,
            full_name: email,
          },
        },
      });

      if (error) {
        const message = String(error.message || "").toLowerCase();
        if (
          message.includes("already registered") ||
          message.includes("already exists")
        ) {
          await sendExistingUserEmailOtp(client, email);
          setOtpPurpose("signin");
          setOtpDialogOpen(true);
          toast({
            title: "Code sent",
            description:
              "We found an existing account and sent a 6-digit sign-in code.",
          });
          return;
        }
        throw error;
      }

      setOtpPurpose("signup");
      if (data.session) {
        await completeInviteAcceptance();
        return;
      }

      setOtpDialogOpen(true);
      toast({
        title: "Check your email",
        description:
          "Enter the 6-digit code to verify your invite without leaving this page.",
      });
    } catch (e: any) {
      const message = e?.message || String(e);
      setActionError(message);
      toast({
        variant: "destructive",
        title: "Could not start invite",
        description: message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const declineInvite = async () => {
    if (!effectiveToken) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await declineTeamInviteByToken(effectiveToken);
      await supabase?.auth.signOut();
      toast({
        title: "Invitation declined",
        description: "You declined the team invitation.",
      });
      navigate("/", { replace: true });
    } catch (e: any) {
      const message = e?.message || String(e);
      setActionError(message);
      toast({
        variant: "destructive",
        title: "Could not decline",
        description: message,
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
          <div className="mt-1 text-sm text-gray-600">
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
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-gray-900">
            Join {organizationName}
          </div>
          <div className="truncate text-sm text-gray-600">
            Invitation for {email || "your email"}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          You were invited to join as{" "}
          <span className="font-semibold">{membershipRole}</span>. Verify your
          email on this page and we’ll finish the invitation without sending you
          through full onboarding.
        </div>

        {actionError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {!canRespondDirectly ? (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900">
                Create your password first
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-invite-password">Password</Label>
                <Input
                  id="team-invite-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Choose a password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-invite-confirm-password">
                  Confirm password
                </Label>
                <Input
                  id="team-invite-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                />
              </div>
            </div>
          ) : null}

          <Button
            className="h-11 w-full bg-[#32C8D1] hover:bg-[#2AB8C1]"
            disabled={!isPending || actionLoading}
            onClick={startInviteFlow}
          >
            {actionLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {canRespondDirectly ? "Finalizing…" : "Sending code…"}
              </span>
            ) : canRespondDirectly ? (
              "Accept & Continue"
            ) : (
              "Set password & send code"
            )}
          </Button>

          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={!isPending || actionLoading}
            onClick={declineInvite}
          >
            Decline
          </Button>

          {authenticated ? (
            <div className="text-xs text-gray-500">
              Signed in as {profile?.email || ""}. This invite expects a{" "}
              {organizationType} account for {email}.
            </div>
          ) : null}
        </div>

        {!isPending ? (
          <div className="mt-6 text-sm text-gray-600">
            This invitation is {invite.status || "not available"}.
          </div>
        ) : null}
      </Card>

      <EmailOtpDialog
        open={otpDialogOpen}
        onOpenChange={setOtpDialogOpen}
        email={email}
        title="Verify your email"
        description={`Enter the 6-digit code from your inbox to finish joining ${organizationName} without leaving the page.`}
        helperText="If the code does not arrive right away, resend it from this dialog."
        verifyLabel="Verify & continue"
        onVerify={handleOtpVerify}
        onResend={handleOtpResend}
      />
    </div>
  );
}
