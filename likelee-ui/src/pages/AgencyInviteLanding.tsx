import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailOtpDialog } from "@/components/auth/EmailOtpDialog";
import {
  acceptAgencyTalentInviteByToken,
  declineAgencyTalentInviteByToken,
  getAgencyTalentInviteByToken,
} from "@/api/functions";
import type { EmailOtpPurpose } from "@/lib/emailOtp";
import {
  normalizeEmail,
  resendSignupEmailOtp,
  sendExistingUserEmailOtp,
  verifyEmailOtpCode,
} from "@/lib/emailOtp";

export default function AgencyInviteLanding() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { authenticated, profile, supabase } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [invite, setInvite] = React.useState<any>(null);
  const [requiresPasswordSetup, setRequiresPasswordSetup] =
    React.useState<boolean>(true);
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
        const res: any = await getAgencyTalentInviteByToken(effectiveToken);
        const inv = res?.invite;
        if (!active) return;
        setInvite(inv || null);
        setRequiresPasswordSetup(Boolean(res?.requires_password_setup));
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
  const agencyName =
    invite?.agencies?.agency_name || invite?.agency_name || "Agency";
  const agencyLogoUrl = invite?.agencies?.logo_url || invite?.agency_logo_url;
  const status = String(invite?.status || "");
  const signedInEmail = normalizeEmail(String(profile?.email || ""));
  const emailMatchesInvite = !!email && signedInEmail === email;
  const effectiveRole = String(profile?.role || "").toLowerCase();
  const hasInviteRole =
    effectiveRole === "creator" || effectiveRole === "talent";
  const canRespondDirectly =
    authenticated && hasInviteRole && emailMatchesInvite;
  const isPending = status === "pending";

  const requireSupabase = () => {
    if (!supabase) {
      throw new Error("Supabase not configured");
    }

    return supabase;
  };

  const completeInviteAcceptance = React.useCallback(async () => {
    if (!effectiveToken) return;

    setActionLoading(true);
    setActionError(null);

    try {
      await acceptAgencyTalentInviteByToken(effectiveToken);
      setOtpDialogOpen(false);
      setPassword("");
      setConfirmPassword("");
      toast({
        title: "Invitation accepted",
        description: "Welcome! Redirecting you to the Talent Portal…",
      });
      navigate("/talentportal", { replace: true });
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
  }, [effectiveToken, navigate]);

  const handleInviteOtpVerify = async (code: string) => {
    const client = requireSupabase();
    await verifyEmailOtpCode(client, {
      email,
      token: code,
      purpose: otpPurpose,
    });
    toast({
      title: "Email verified",
      description: "Finalizing your invitation on this tab…",
    });
    await completeInviteAcceptance();
  };

  const handleInviteOtpResend = async () => {
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

  const startInviteOtpFlow = async () => {
    if (!effectiveToken || !isPending) return;

    setActionLoading(true);
    setActionError(null);

    try {
      if (canRespondDirectly) {
        await completeInviteAcceptance();
        return;
      }

      const client = requireSupabase();

      if (requiresPasswordSetup) {
        if (!password) {
          throw new Error("Create a password to continue.");
        }
        if (password.length < 6) {
          throw new Error("Password should be at least 6 characters.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const displayName = String(invite?.invited_name || email || "Creator");
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName,
              role: "creator",
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
            setRequiresPasswordSetup(false);
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
        return;
      }

      await sendExistingUserEmailOtp(client, email);
      setOtpPurpose("signin");
      setOtpDialogOpen(true);
      toast({
        title: "Code sent",
        description: "Enter the 6-digit code from your email to continue.",
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
      await declineAgencyTalentInviteByToken(effectiveToken);
      await supabase?.auth.signOut();
      toast({
        title: "Invitation declined",
        description: "You declined the invitation.",
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
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {agencyLogoUrl ? (
              <img
                src={agencyLogoUrl}
                alt={agencyName}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-sm font-bold text-gray-600">
                {(String(agencyName).trim()[0] || "A").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-gray-900">
              Join {agencyName}
            </div>
            <div className="truncate text-sm text-gray-600">
              Invitation for {email || "your email"}
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-700">
          Accept this invitation to continue to the Talent Portal without
          leaving your current tab.
        </div>

        {actionError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {!canRespondDirectly && requiresPasswordSetup ? (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-900">
                Create your password first
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Choose a password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-confirm-password">
                  Confirm password
                </Label>
                <Input
                  id="invite-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                />
              </div>
            </div>
          ) : null}

          {canRespondDirectly ? (
            <>
              <Button
                className="h-11 w-full bg-[#32C8D1] hover:bg-[#2AB8C1]"
                disabled={!isPending || actionLoading}
                onClick={startInviteOtpFlow}
              >
                {actionLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizing…
                  </span>
                ) : (
                  "Accept & Continue"
                )}
              </Button>
              <div className="text-xs text-gray-500">
                You are already signed in with the invited account, so we can
                finish acceptance immediately.
              </div>
              <Button
                variant="outline"
                className="h-11 w-full"
                disabled={!isPending || actionLoading}
                onClick={declineInvite}
              >
                Decline
              </Button>
            </>
          ) : (
            <>
              <Button
                className="h-11 w-full bg-[#32C8D1] hover:bg-[#2AB8C1]"
                disabled={!isPending || actionLoading}
                onClick={startInviteOtpFlow}
              >
                {actionLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code…
                  </span>
                ) : requiresPasswordSetup ? (
                  "Set password & send code"
                ) : (
                  "Send verification code"
                )}
              </Button>

              <div className="text-xs text-gray-500">
                {requiresPasswordSetup
                  ? "Create your password first, then we’ll email a 6-digit code and keep you on this page while we verify it."
                  : "We’ll email a 6-digit sign-in code and keep you on this page while we verify it."}
              </div>

              {authenticated ? (
                <>
                  <div className="text-xs text-amber-700">
                    Signed in as {profile?.email || "another account"}. Verify{" "}
                    {email || "the invited email"} to switch this tab and finish
                    acceptance.
                  </div>
                  <Button
                    variant="outline"
                    className="h-11 w-full"
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
              ) : null}
            </>
          )}

          {authenticated ? (
            <div className="text-xs text-gray-500">
              Signed in as {profile?.email || ""}
            </div>
          ) : null}
        </div>

        {!isPending ? (
          <div className="mt-6 text-sm text-gray-600">
            This invitation is {status || "not available"}.
          </div>
        ) : null}
      </Card>

      <EmailOtpDialog
        open={otpDialogOpen}
        onOpenChange={setOtpDialogOpen}
        email={email}
        title={t("auth.emailOtp.title")}
        description={t("auth.emailOtp.description")}
        helperText={t("auth.emailOtp.helperText")}
        verifyLabel={t("auth.emailOtp.continueButton")}
        onVerify={handleInviteOtpVerify}
        onResend={handleInviteOtpResend}
      />
    </div>
  );
}
