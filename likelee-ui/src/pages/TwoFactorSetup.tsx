import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Shield,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import QRCode from "qrcode";
import { getDashboardPath } from "@/auth/onboarding";

type Step = "intro" | "enroll" | "verify" | "success" | "manage" | "challenge";
const MFA_PENDING_STORAGE_KEY = "likelee_mfa_pending_next";

interface FactorInfo {
  id: string;
  friendly_name?: string;
  status: string;
  factor_type: string;
}

export default function TwoFactorSetup() {
  const { t } = useTranslation("auth");
  const { mfa, authenticated, initialized, profile, refreshProfile } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "manage";
  const nextParam = searchParams.get("next") || "/";

  const [step, setStep] = useState<Step>(
    mode === "challenge" ? "challenge" : "intro",
  );
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<FactorInfo[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [challengeCode, setChallengeCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [friendlyName, setFriendlyName] = useState(
    t("twoFactorSetup.enroll.defaultDeviceName"),
  );
  const [unverifiedFactors, setUnverifiedFactors] = useState<FactorInfo[]>([]);

  const loadFactors = useCallback(async () => {
    if (!mfa) {
      console.warn("MFA service not available yet");
      return;
    }
    try {
      const { data, error: err } = await mfa.listFactors();
      if (err) throw err;
      const allFactors = data?.all || [];
      const verified = allFactors
        .filter((f) => f.status === "verified")
        .map((f) => ({
          id: f.id,
          friendly_name: f.friendly_name,
          status: f.status,
          factor_type: f.factor_type,
        }));
      const unverified = allFactors
        .filter((f) => f.status !== "verified")
        .map((f) => ({
          id: f.id,
          friendly_name: f.friendly_name,
          status: f.status,
          factor_type: f.factor_type,
        }));
      setFactors(verified);
      setUnverifiedFactors(unverified);
      if (verified.length > 0 && !selectedFactorId) {
        setSelectedFactorId(verified[0].id);
      } else if (verified.length === 0 && !selectedFactorId) {
        // Only set to null if it's not already set (e.g., during enrollment/verify flow)
        setSelectedFactorId(null);
      }
    } catch (err: any) {
      console.error("Failed to load factors:", err);
      setError(t("twoFactorSetup.errors.loadFailed"));
    }
  }, [mfa, selectedFactorId]);

  useEffect(() => {
    if (!initialized) return;
    if (!authenticated) {
      navigate("/login");
      return;
    }
    loadFactors();
  }, [initialized, authenticated, navigate, loadFactors]);

  useEffect(() => {
    // Don't load factors during enrollment or verify steps
    if (step === "enroll" || step === "verify") {
      return;
    }
    if (step === "manage" || step === "intro") {
      loadFactors();
    }
  }, [step, loadFactors]);

  const cleanupUnverifiedFactors = async () => {
    if (!mfa || unverifiedFactors.length === 0) return;
    for (const factor of unverifiedFactors) {
      try {
        await mfa.unenroll(factor.id);
      } catch (e) {
        console.error("Failed to cleanup factor:", e);
      }
    }
    setUnverifiedFactors([]);
  };

  const handleEnroll = async () => {
    if (!mfa) {
      setError(t("twoFactorSetup.errors.serviceUnavailable"));
      return;
    }
    if (!friendlyName.trim()) {
      setError(t("twoFactorSetup.errors.deviceNameRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await cleanupUnverifiedFactors();
      const { data, error: err } = await mfa.enroll({
        factorType: "totp",
        friendlyName,
      });
      if (err) throw err;
      if (data && data.type === "totp" && data.totp) {
        let nextQrDataUrl: string | null = null;

        if (data.totp.qr_code) {
          nextQrDataUrl = data.totp.qr_code;
        } else if (data.totp.uri) {
          nextQrDataUrl = await QRCode.toDataURL(data.totp.uri, {
            width: 256,
            margin: 2,
          });
        }

        console.log("[handleEnroll] Success - setting factor ID:", data.id);

        // Set factor ID first, then other state
        setSelectedFactorId(data.id);
        setQrDataUrl(nextQrDataUrl);
        setTotpSecret(data.totp.secret || null);
        setStep("verify");
        return;
      }

      throw new Error(t("twoFactorSetup.errors.setupCouldNotStart"));
    } catch (err: any) {
      const errorCode = err.code || err.error_code || "";
      const errorMessage = err.message || "";

      if (
        errorCode === "mfa_factor_name_conflict" ||
        errorMessage.includes("already exists")
      ) {
        setError(
          t("twoFactorSetup.errors.nameConflict", { name: friendlyName }),
        );
      } else if (errorCode === "mfa_totp_limit_reached") {
        setError(t("twoFactorSetup.errors.limitReached"));
      } else if (errorCode === "auth/mfa") {
        setError(t("twoFactorSetup.errors.setupIssue"));
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")
      ) {
        setError(t("twoFactorSetup.errors.networkSetup"));
      } else {
        setError(errorMessage || t("twoFactorSetup.errors.setupGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    console.log("[handleVerify] Called with:", {
      hasMfa: !!mfa,
      selectedFactorId,
      verifyCodeLength: verifyCode.length,
      verifyCode,
    });
    if (!mfa || !selectedFactorId || verifyCode.length !== 6) {
      console.error("[handleVerify] Early return - missing requirements");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log("[handleVerify] Calling challengeAndVerify...");
      const { error: err } = await mfa.challengeAndVerify(
        selectedFactorId,
        verifyCode,
      );
      console.log("[handleVerify] challengeAndVerify result:", { err });
      if (err) throw err;
      setStep("success");
      toast({
        title: t("twoFactorSetup.verify.enabledTitle"),
        description: t("twoFactorSetup.verify.enabledDescription"),
      });
    } catch (err: any) {
      console.error("[handleVerify] Error:", err);
      const errorCode = err.code || err.error_code || "";
      const errorMessage = err.message || "";

      if (errorCode === "mfa_challenge_expired") {
        setError(t("twoFactorSetup.errors.expiredSetup"));
      } else if (
        errorCode === "mfa_invalid_code" ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("incorrect")
      ) {
        setError(t("twoFactorSetup.errors.invalidCode"));
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")
      ) {
        setError(t("twoFactorSetup.errors.networkVerify"));
      } else {
        setError(errorMessage || t("twoFactorSetup.errors.verifyGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeVerify = async () => {
    if (!mfa || !selectedFactorId || challengeCode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      console.log("[TwoFactorSetup] Starting MFA verification...");
      const { error: err } = await mfa.challengeAndVerify(
        selectedFactorId,
        challengeCode,
      );
      if (err) throw err;

      console.log("[TwoFactorSetup] MFA verification successful");

      toast({
        title: t("twoFactorSetup.challenge.verificationCompleteTitle"),
        description: t(
          "twoFactorSetup.challenge.verificationCompleteDescription",
        ),
      });

      // Mark that we just completed MFA so ProtectedRoute knows to wait for profile
      sessionStorage.setItem("mfa_just_completed", "true");
      sessionStorage.removeItem(MFA_PENDING_STORAGE_KEY);

      console.log("[TwoFactorSetup] Refreshing profile...");
      // Trigger profile refresh
      if (refreshProfile) {
        await refreshProfile();
      }

      console.log("[TwoFactorSetup] Waiting for state to settle...");
      // Give more time for the auth state to update and profile to load
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Determine the correct redirect path based on the loaded profile
      let redirectPath = nextParam;
      if (nextParam === "dashboard" || nextParam === "/") {
        // Use the profile to determine the correct dashboard
        redirectPath = getDashboardPath(profile);
        console.log(
          "[TwoFactorSetup] Determined dashboard path:",
          redirectPath,
          "for role:",
          profile?.role,
        );
      }

      console.log("[TwoFactorSetup] Navigating to:", redirectPath);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      console.error("[TwoFactorSetup] MFA verification error:", err);
      const errorCode = err.code || err.error_code || "";
      const errorMessage = err.message || "";

      if (errorCode === "mfa_challenge_expired") {
        setError(t("twoFactorSetup.errors.expiredLogin"));
      } else if (
        errorCode === "mfa_invalid_code" ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("incorrect")
      ) {
        setError(t("twoFactorSetup.errors.invalidCode"));
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")
      ) {
        setError(t("twoFactorSetup.errors.networkVerify"));
      } else {
        setError(errorMessage || t("twoFactorSetup.errors.verifyGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async (factorId: string) => {
    if (!mfa) return;
    if (!confirm(t("twoFactorSetup.manage.disableConfirm"))) return;
    setLoading(true);
    try {
      const { error: err } = await mfa.unenroll(factorId);
      if (err) throw err;
      toast({
        title: t("twoFactorSetup.manage.disabledTitle"),
        description: t("twoFactorSetup.manage.disabledDescription"),
      });
      loadFactors();
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message || t("twoFactorSetup.errors.failedToDisable"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!initialized || !authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (step === "challenge") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white border border-gray-200 rounded-lg shadow-none">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("twoFactorSetup.challenge.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {t("twoFactorSetup.challenge.description")}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex justify-center mb-6">
            <InputOTP
              maxLength={6}
              value={challengeCode}
              onChange={setChallengeCode}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {!selectedFactorId && !error && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4" />
              {t("twoFactorSetup.challenge.waitingForMethod")}
            </div>
          )}

          <Button
            onClick={handleChallengeVerify}
            disabled={
              challengeCode.length !== 6 || loading || !selectedFactorId
            }
            className="w-full h-12 bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("twoFactorSetup.challenge.verifyButton")
            )}
          </Button>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {t("twoFactorSetup.challenge.signInDifferentAccount")}
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "enroll") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => {
              sessionStorage.removeItem(MFA_PENDING_STORAGE_KEY);
              navigate(-1);
            }}
            className="mb-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("twoFactorSetup.manage.back")}
          </Button>

          <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#F7B750]/10 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#F7B750]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t("twoFactorSetup.enroll.title")}
                </h1>
                <p className="text-sm text-gray-500">
                  {t("twoFactorSetup.enroll.subtitle")}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  {t("twoFactorSetup.enroll.howItWorks")}
                </h3>
                <ol className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </span>
                    <span>{t("twoFactorSetup.enroll.step1")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </span>
                    <span>{t("twoFactorSetup.enroll.step2")}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      3
                    </span>
                    <span>{t("twoFactorSetup.enroll.step3")}</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="friendlyName">
                  {t("twoFactorSetup.enroll.deviceNameLabel")}
                </Label>
                <Input
                  id="friendlyName"
                  value={friendlyName}
                  onChange={(e) => setFriendlyName(e.target.value)}
                  placeholder={t("twoFactorSetup.enroll.deviceNamePlaceholder")}
                  className="max-w-xs"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("manage")}
                  className="flex-1"
                >
                  {t("twoFactorSetup.enroll.cancel")}
                </Button>
                <Button
                  onClick={handleEnroll}
                  disabled={loading || !friendlyName.trim()}
                  className="flex-1 bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("twoFactorSetup.enroll.settingUp")}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      {t("twoFactorSetup.enroll.enable")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "intro" || step === "manage") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("twoFactorSetup.manage.back")}
          </Button>

          <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#F7B750]/10 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#F7B750]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t("twoFactorSetup.manage.title")}
                </h1>
                <p className="text-sm text-gray-500">
                  {t("twoFactorSetup.manage.subtitle")}
                </p>
              </div>
            </div>

            {factors.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    {t("twoFactorSetup.manage.enabled")}
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg divide-y">
                  {factors.map((factor) => (
                    <div
                      key={factor.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {factor.friendly_name ||
                              t("twoFactorSetup.manage.authenticatorApp")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {factor.factor_type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnenroll(factor.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t("twoFactorSetup.manage.remove")}
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setStep("enroll")}
                  className="mt-4"
                >
                  {t("twoFactorSetup.manage.addAnother")}
                </Button>
              </div>
            ) : unverifiedFactors.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-yellow-600 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {t("twoFactorSetup.manage.incompleteTitle")}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {t("twoFactorSetup.manage.incompleteDescription")}
                </p>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg divide-y divide-yellow-200">
                  {unverifiedFactors.map((factor) => (
                    <div
                      key={factor.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {factor.friendly_name ||
                              t("twoFactorSetup.manage.authenticatorApp")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {t("twoFactorSetup.manage.unverified")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!mfa) return;
                          setLoading(true);
                          try {
                            await mfa.unenroll(factor.id);
                            toast({
                              title: t("twoFactorSetup.manage.removedTitle"),
                              description: t(
                                "twoFactorSetup.manage.removedDescription",
                              ),
                            });
                            loadFactors();
                          } catch (e: any) {
                            toast({
                              title: t("common.error"),
                              description:
                                e.message ||
                                t("twoFactorSetup.errors.failedToRemove"),
                              variant: "destructive",
                            });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t("twoFactorSetup.manage.remove")}
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={async () => {
                    if (!mfa) {
                      setError(t("twoFactorSetup.errors.authUnavailable"));
                      return;
                    }
                    setLoading(true);
                    try {
                      for (const factor of unverifiedFactors) {
                        await mfa.unenroll(factor.id);
                      }
                      setUnverifiedFactors([]);
                      toast({
                        title: t("twoFactorSetup.manage.cleanedTitle"),
                        description: t(
                          "twoFactorSetup.manage.cleanedDescription",
                        ),
                      });
                      setStep("enroll");
                    } catch (e: any) {
                      console.error("Failed to cleanup:", e);
                      setError(
                        t("twoFactorSetup.errors.cleanupFailed", {
                          message:
                            e.message ||
                            t("twoFactorSetup.errors.unknownError"),
                        }),
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("twoFactorSetup.manage.cleaningUp")}
                    </>
                  ) : (
                    t("twoFactorSetup.manage.startFresh")
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4">
                    {t("twoFactorSetup.enroll.howItWorks")}
                  </h3>
                  <ol className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </span>
                      <span>{t("twoFactorSetup.enroll.step1")}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </span>
                      <span>{t("twoFactorSetup.enroll.step2")}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        3
                      </span>
                      <span>{t("twoFactorSetup.enroll.step3")}</span>
                    </li>
                  </ol>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="friendlyName">
                    {t("twoFactorSetup.enroll.deviceNameLabel")}
                  </Label>
                  <Input
                    id="friendlyName"
                    value={friendlyName}
                    onChange={(e) => setFriendlyName(e.target.value)}
                    placeholder={t(
                      "twoFactorSetup.enroll.deviceNamePlaceholder",
                    )}
                    className="max-w-xs"
                  />
                </div>

                <Button
                  onClick={handleEnroll}
                  disabled={loading || !friendlyName.trim()}
                  className="bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("twoFactorSetup.enroll.settingUp")}
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      {t("twoFactorSetup.enroll.enable")}
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (step === "verify") {
    // If we're in verify step but don't have a factor ID, something went wrong
    if (!selectedFactorId) {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-md mx-auto py-8">
            <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {t("twoFactorSetup.verify.setupError")}
              </div>
              <Button
                onClick={() => setStep("intro")}
                className="w-full bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold"
              >
                {t("twoFactorSetup.manage.back")}
              </Button>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => setStep("intro")}
            className="mb-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("twoFactorSetup.enroll.cancel")}
          </Button>

          <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-none">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {t("twoFactorSetup.verify.title")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("twoFactorSetup.verify.description")}
              </p>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img
                    src={qrDataUrl}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            )}

            {totpSecret && (
              <div className="mb-6 text-center">
                <p className="text-xs text-gray-500 mb-1">
                  {t("twoFactorSetup.verify.manualEntry")}
                </p>
                <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
                  {totpSecret}
                </code>
              </div>
            )}

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("twoFactorSetup.verify.enterCode")}</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verifyCode}
                    onChange={(val) => {
                      console.log("[InputOTP] Changed:", val);
                      setVerifyCode(val);
                    }}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {verifyCode.length > 0 && (
                  <p className="text-xs text-center text-gray-500">
                    {t("twoFactorSetup.verify.enteredDigits", {
                      count: verifyCode.length,
                    })}
                  </p>
                )}
              </div>

              <Button
                onClick={() => {
                  console.log("[VerifyButton] Clicked", {
                    verifyCode,
                    verifyCodeLength: verifyCode.length,
                    selectedFactorId,
                    disabled: verifyCode.length !== 6 || loading,
                  });
                  handleVerify();
                }}
                disabled={verifyCode.length !== 6 || loading}
                className="w-full bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("twoFactorSetup.verify.verifyAndEnable")
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white border border-gray-200 rounded-lg shadow-none text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t("twoFactorSetup.success.title")}
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {t("twoFactorSetup.success.description")}
          </p>
          <Button
            onClick={() => {
              loadFactors();
              setStep("manage");
            }}
            className="bg-[#F7B750] hover:bg-[#F7B750]/90 text-white font-bold"
          >
            {t("twoFactorSetup.success.done")}
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}
