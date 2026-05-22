import React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import {
  getDashboardPath,
  getOnboardingPath,
  getSignupPathForRole,
  isOnboardingIncomplete,
  readAuthIntent,
  saveAuthIntent,
  type AuthIntentRole,
} from "@/auth/onboarding";

import { getFriendlyErrorMessage } from "@/utils/errorMapping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs as UITabs,
  TabsContent as UITabsContent,
  TabsList as UITabsList,
  TabsTrigger as UITabsTrigger,
} from "@/components/ui/tabs";
import { Separator as UISeparator } from "@/components/ui/separator";

const Tabs: any = UITabs;
const TabsContent: any = UITabsContent;
const TabsList: any = UITabsList;
const TabsTrigger: any = UITabsTrigger;
const Separator: any = UISeparator;
const Label: any = UILabel;
const MFA_PENDING_STORAGE_KEY = "likelee_mfa_pending_next";

export default function Login() {
  const { t } = useTranslation();
  const {
    login,
    loginWithProvider,
    initialized,
    authenticated,
    profile,
    logout,
    user,
  } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loginAttempted, setLoginAttempted] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const creatorType = searchParams.get("type");
  const isOauthReturn = searchParams.get("oauth") === "1";
  const redirectFromQuery = searchParams.get("next");
  const preferredRoleFromQuery = searchParams.get("role");
  const redirectFromState = React.useMemo(() => {
    const from = (location.state as any)?.from;
    const pathname = typeof from?.pathname === "string" ? from.pathname : "";
    if (!pathname || pathname.toLowerCase() === "/login") {
      return null;
    }
    const search = typeof from?.search === "string" ? from.search : "";
    const hash = typeof from?.hash === "string" ? from.hash : "";
    return `${pathname}${search}${hash}`;
  }, [location.state]);
  const redirectTarget = React.useMemo(() => {
    if (redirectFromQuery && redirectFromQuery.startsWith("/")) {
      return redirectFromQuery;
    }
    return redirectFromState;
  }, [redirectFromQuery, redirectFromState]);
  const preferredRole = React.useMemo(() => {
    if (
      preferredRoleFromQuery === "creator" ||
      preferredRoleFromQuery === "brand" ||
      preferredRoleFromQuery === "agency"
    ) {
      return preferredRoleFromQuery;
    }
    const fromStateRole = (location.state as any)?.preferredRole;
    if (
      fromStateRole === "creator" ||
      fromStateRole === "brand" ||
      fromStateRole === "agency"
    ) {
      return fromStateRole;
    }
    return "creator";
  }, [location.state, preferredRoleFromQuery]);

  // Track if we're about to redirect
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  // Guard against race conditions during logout/tab switch
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [userType, setUserType] = React.useState(preferredRole);
  const googleLoginRedirectTo = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("oauth", "1");
    params.set("role", userType);

    if (creatorType) {
      params.set("type", creatorType);
    }
    if (redirectTarget && redirectTarget.startsWith("/")) {
      params.set("next", redirectTarget);
    }

    return `${window.location.origin}/login?${params.toString()}`;
  }, [creatorType, redirectTarget, userType]);

  React.useEffect(() => {
    setUserType(preferredRole);
  }, [preferredRole]);

  React.useEffect(() => {
    console.log("[Login] useEffect START", {
      authenticated,
      initialized,
      profileState:
        profile === undefined
          ? "PENDING"
          : profile === null
            ? "NO_PROFILE"
            : "EXISTS",
      accessDenied,
    });

    // Reset accessDenied once we are fully logged out
    if (!authenticated) {
      setAccessDenied(false);
      setIsRedirecting(false);
      return;
    }

    if (!initialized) return;
    if (accessDenied) return;

    const pendingMfaNext = sessionStorage.getItem(MFA_PENDING_STORAGE_KEY);
    if (pendingMfaNext) {
      setIsRedirecting(true);
      navigate(
        `/TwoFactorSetup?mode=challenge&next=${encodeURIComponent(
          pendingMfaNext,
        )}`,
        { replace: true },
      );
      return;
    }

    const authIntent = readAuthIntent();
    const normalizedUserType = (userType || "").toLowerCase().trim();
    const creatorSignupPath = getSignupPathForRole(
      "creator",
      authIntent?.creatorType || creatorType,
    );
    const authUserRole = String(
      user?.user_metadata?.role || user?.app_metadata?.role || "",
    )
      .trim()
      .toLowerCase();
    const oauthRoleHint =
      isOauthReturn &&
      (preferredRoleFromQuery === "creator" ||
        preferredRoleFromQuery === "brand" ||
        preferredRoleFromQuery === "agency")
        ? preferredRoleFromQuery
        : null;
    const signupRoleHint = (() => {
      if (authIntent?.role) return authIntent.role;
      if (oauthRoleHint) return oauthRoleHint;
      if (authUserRole === "creator" || authUserRole === "brand") {
        return authUserRole;
      }
      if (authUserRole === "agency") return "agency";
      if (authUserRole === "talent") return "creator";
      return null;
    })();

    // Check if profile resolution is complete (either profile fetch finished or user has no session)
    // undefined = fetch not done yet; null = fetch done, no profile; Profile = fetch done, found profile
    const profileResolved = initialized && (profile !== undefined || !user);

    console.log("[Login] profileResolved:", profileResolved, {
      initialized,
      profile:
        profile === undefined
          ? "PENDING"
          : profile === null
            ? "NO_PROFILE"
            : "EXISTS",
      hasUser: !!user,
    });

    if (!profile) {
      console.log("[Login] No profile branch", {
        profileResolved,
        signupRoleHint,
        authenticated,
      });

      if (!profileResolved) {
        console.log("[Login] Profile not resolved yet, waiting...");
        return;
      }

      // For authenticated users without profile, redirect to signup
      if (signupRoleHint && authenticated) {
        console.log(
          "[Login] Redirecting to signup:",
          getSignupPathForRole(
            signupRoleHint,
            authIntent?.creatorType || creatorType,
          ),
        );
        setIsRedirecting(true);
        navigate(
          getSignupPathForRole(
            signupRoleHint,
            authIntent?.creatorType || creatorType,
          ),
          {
            replace: true,
          },
        );
      }
      return;
    }

    if (initialized && authenticated && profile) {
      console.log("[Login] Profile exists, checking role match", {
        profileRole: profile.role,
        userType,
      });
      const normalizedRole = (profile.role || "").toLowerCase().trim();

      if (!normalizedRole) {
        setError("Account role not found. Please contact support.");
        setAccessDenied(true);
        logout();
        return;
      }

      // Check if onboarding is complete using the shared logic
      const isOnboardingComplete = !isOnboardingIncomplete(profile);

      if (!isOnboardingComplete) {
        // Redirect to appropriate signup form to complete profile
        setIsRedirecting(true);
        const signupPath =
          getOnboardingPath({
            ...profile,
            creator_type:
              profile.creator_type || authIntent?.creatorType || creatorType,
          } as any) ||
          getSignupPathForRole(
            profile.role as AuthIntentRole,
            authIntent?.creatorType || creatorType,
          );
        navigate(signupPath, { replace: true });
        return;
      }

      // Set redirecting state to hide content during navigation
      setIsRedirecting(true);

      if (redirectTarget) {
        navigate(redirectTarget, { replace: true });
      } else {
        const dashboard = getDashboardPath(profile);
        navigate(dashboard, { replace: true });
      }
    }
  }, [
    initialized,
    authenticated,
    profile,
    user,
    navigate,
    creatorType,
    isOauthReturn,
    preferredRoleFromQuery,
    redirectTarget,
    userType,
    logout,
    accessDenied,
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setLoading(true);
    try {
      const mfaResult = await login(email, password);
      if (mfaResult.requiresMFA) {
        setIsRedirecting(true);
        // Use redirect target if specified, otherwise use a placeholder
        // The actual dashboard will be determined after MFA based on the loaded profile
        const next = redirectTarget || "dashboard";
        sessionStorage.setItem(MFA_PENDING_STORAGE_KEY, next);
        navigate(
          `/TwoFactorSetup?mode=challenge&next=${encodeURIComponent(next)}`,
          { replace: true },
        );
        return;
      }
      sessionStorage.removeItem(MFA_PENDING_STORAGE_KEY);
    } catch (err: any) {
      sessionStorage.removeItem(MFA_PENDING_STORAGE_KEY);
      const msg = getFriendlyErrorMessage(err, t);
      const lower = String(err?.message || msg || "").toLowerCase();
      const isUserFixableAuthError =
        lower.includes("invalid login credentials") ||
        lower.includes("incorrect email or password") ||
        lower.includes("email not confirmed") ||
        lower.includes("password should be at least") ||
        lower.includes("invalid token") ||
        lower.includes("otp") ||
        lower.includes("rate limit exceeded");
      setError(msg);
      toast({
        title: isUserFixableAuthError
          ? t("warningLabel", { ns: "common", defaultValue: "Warning" })
          : t("common.error"),
        description: msg,
        variant: isUserFixableAuthError ? "warning" : "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignupLink = () => {
    if (
      userType === "creator" ||
      userType === "brand" ||
      userType === "agency"
    ) {
      return getSignupPathForRole(
        userType as AuthIntentRole,
        creatorType || null,
      );
    }
    return "/Register";
  };

  // Keep authenticated OAuth callbacks on the redirect loader until routing settles.
  const shouldShowLoading =
    isRedirecting || (isOauthReturn && (!initialized || authenticated));

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#32C8D1] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          >
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              {t("auth.login.redirectLoadingLabel")}
            </span>
          </div>
          <p className="mt-4 text-gray-600">
            {isOauthReturn
              ? t("auth.login.completingSignup")
              : t("auth.login.redirecting")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-4">{t("auth.login.title")}</h1>
      {!initialized ? (
        <p>{t("auth.login.loading")}</p>
      ) : (
        <Card className="w-full max-w-md border-2 border-gray-100 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center p-4">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                  alt="Likelee Logo"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">
                {t("auth.login.welcome")}
              </CardTitle>
              <CardDescription className="text-gray-500 font-medium">
                {t("auth.login.signInToContinue")}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs
              value={userType}
              className="w-full"
              onValueChange={(value) => {
                setUserType(value);
                setError(null);
              }}
            >
              <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-gray-100 rounded-xl">
                <TabsTrigger
                  value="creator"
                  className="rounded-lg data-[state=active]:bg-[#32C8D1] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 font-bold"
                >
                  {t("auth.login.tabs.creator", "Creator")}
                </TabsTrigger>
                <TabsTrigger
                  value="brand"
                  className="rounded-lg data-[state=active]:bg-[#32C8D1] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 font-bold"
                >
                  {t("auth.login.tabs.brand", "Brand")}
                </TabsTrigger>
                <TabsTrigger
                  value="agency"
                  className="rounded-lg data-[state=active]:bg-[#32C8D1] data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300 font-bold"
                >
                  {t("auth.login.tabs.agency", "Agency")}
                </TabsTrigger>
              </TabsList>
              {(userType === "creator" ||
                userType === "brand" ||
                userType === "agency") && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold flex items-center justify-center gap-3 rounded-xl transition-all"
                    onClick={async () => {
                      try {
                        // Save auth intent before OAuth redirect so new users know which role to sign up for
                        saveAuthIntent({
                          role: userType as "creator" | "brand" | "agency",
                          creatorType: creatorType || null,
                        });
                        await loginWithProvider("google", {
                          redirectTo: googleLoginRedirectTo,
                        });
                      } catch (err: any) {
                        toast({
                          title: t("auth.login.googleSignInFailed"),
                          description: getFriendlyErrorMessage(err, t),
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {t("auth.login.continueWithGoogle")}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">
                        {t("auth.login.or")}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-bold text-gray-700 ml-1"
                      >
                        {userType === "brand"
                          ? t("auth.login.companyEmailLabel")
                          : t("auth.login.emailLabel")}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("auth.login.emailPlaceholder")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          className="pl-12 h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32C8D1] focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <Label
                          htmlFor="password"
                          className="text-sm font-bold text-gray-700"
                        >
                          {t("auth.login.passwordLabel")}
                        </Label>
                        <Link
                          to="/forgot-password"
                          className="text-xs font-bold text-[#32C8D1] hover:underline"
                        >
                          {t("auth.login.forgotPassword")}
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.login.passwordPlaceholder")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="pl-12 pr-12 h-12 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32C8D1] focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium animate-in fade-in zoom-in duration-300 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t("auth.login.signingIn")}
                        </div>
                      ) : (
                        t("auth.login.signInButton")
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </Tabs>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-500 font-medium">
                {t("auth.login.needAccount")}{" "}
                <Link
                  to={getSignupLink()}
                  className="text-[#32C8D1] font-bold hover:underline"
                >
                  {t("auth.login.signUp")}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
