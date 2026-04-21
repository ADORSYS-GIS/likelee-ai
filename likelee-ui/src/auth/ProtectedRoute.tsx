import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import {
  getOnboardingPath,
  isOnboardingIncomplete,
  brandNeedsPricing,
  getBrandPricingPath,
} from "./onboarding";
import { useTeamAccess } from "@/features/team/useTeamAccess";

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="text-center">
      <div
        className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#32C8D1] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
        role="status"
      >
        <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
          Loading...
        </span>
      </div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermissions,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
}) {
  const { initialized, authenticated, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [waitingForProfile, setWaitingForProfile] = React.useState(false);

  const normalizedRole = String(
    (profile as any)?.organization_type || profile?.role || "",
  )
    .trim()
    .toLowerCase();
  const isTeamScopedRole =
    normalizedRole === "agency" || normalizedRole === "brand";
  const {
    loading: loadingTeamAccess,
    context,
    hasPermission,
    error: teamAccessError,
  } = useTeamAccess(
    isTeamScopedRole ? (normalizedRole as "agency" | "brand") : undefined,
  );

  // Check if we just completed MFA
  const mfaJustCompleted = React.useMemo(() => {
    const flag = sessionStorage.getItem("mfa_just_completed");
    if (flag === "true") {
      console.log("[ProtectedRoute] MFA just completed, will wait for profile");
      // Clear the flag after reading it
      sessionStorage.removeItem("mfa_just_completed");
      return true;
    }
    return false;
  }, []);

  // If MFA was just completed, wait a bit longer for profile to load
  React.useEffect(() => {
    if (mfaJustCompleted && !profile && authenticated) {
      console.log("[ProtectedRoute] Waiting for profile after MFA...");
      setWaitingForProfile(true);
      const timeout = setTimeout(() => {
        console.log("[ProtectedRoute] Profile wait timeout reached");
        setWaitingForProfile(false);
      }, 3000); // Wait up to 3 seconds for profile
      return () => clearTimeout(timeout);
    } else if (profile) {
      console.log("[ProtectedRoute] Profile loaded:", profile.role);
      setWaitingForProfile(false);
    }
  }, [mfaJustCompleted, profile, authenticated]);

  const effectiveRoles = React.useMemo(() => {
    if (!profile?.role) return [];
    if (profile.role === "talent") return ["talent", "creator"];
    return [profile.role];
  }, [profile?.role]);
  const onboardingPath = React.useMemo(
    () => getOnboardingPath(profile),
    [profile],
  );
  const pricingPath = React.useMemo(
    () => getBrandPricingPath(profile),
    [profile],
  );

  // Check if this is a billing success redirect - allow access even without active subscription
  // Uses session storage to persist state across redirects while profile refreshes
  const isBillingSuccess = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSuccess = params.get("billing_success") === "1";
    if (urlSuccess) {
      sessionStorage.setItem("billing_success_pending", "true");
      // Set expiry (5 minutes) in case user doesn't complete flow
      sessionStorage.setItem(
        "billing_success_expiry",
        String(Date.now() + 5 * 60 * 1000),
      );
      return true;
    }
    const storedPending = sessionStorage.getItem("billing_success_pending");
    const expiryStr = sessionStorage.getItem("billing_success_expiry");
    if (storedPending === "true" && expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() > expiry) {
        // Expired, clear the flags
        sessionStorage.removeItem("billing_success_pending");
        sessionStorage.removeItem("billing_success_expiry");
        return false;
      }
      return true;
    }
    return false;
  }, []);

  const missingRequiredPermission = React.useMemo(() => {
    if (!requiredPermissions?.length || !isTeamScopedRole) {
      return false;
    }
    return !requiredPermissions.every((permission) =>
      hasPermission(permission),
    );
  }, [hasPermission, isTeamScopedRole, requiredPermissions]);

  // Handle role-based redirect with useEffect to prevent content flash
  React.useEffect(() => {
    if (initialized && authenticated && profile) {
      // Check for role-based access
      if (
        allowedRoles &&
        !allowedRoles.some((r) => effectiveRoles.includes(r))
      ) {
        navigate("/Unauthorized", { replace: true });
        return;
      }

      if (
        requiredPermissions?.length &&
        isTeamScopedRole &&
        !loadingTeamAccess &&
        context !== null &&
        missingRequiredPermission
      ) {
        navigate("/Unauthorized", {
          replace: true,
          state: {
            reason: teamAccessError || "Missing required team permission.",
          },
        });
        return;
      }

      // Redirect incomplete onboarding to signup
      if (
        onboardingPath &&
        isOnboardingIncomplete(profile) &&
        window.location.pathname !== onboardingPath.split("?")[0]
      ) {
        navigate(onboardingPath, { replace: true });
        return;
      }

      // Redirect brands without subscription to pricing page
      // Skip if this is a billing success redirect (webhook may still be processing)
      // Also clear billing success flag if subscription is now active
      const hasActiveSubscription =
        profile.subscription_status === "active" ||
        profile.subscription_status === "trialing";
      if (hasActiveSubscription && isBillingSuccess) {
        sessionStorage.removeItem("billing_success_pending");
        sessionStorage.removeItem("billing_success_expiry");
      }
      if (
        pricingPath &&
        !isBillingSuccess &&
        window.location.pathname !== "/brandpricing"
      ) {
        navigate(pricingPath, { replace: true });
        return;
      }
    }
  }, [
    initialized,
    authenticated,
    profile,
    allowedRoles,
    requiredPermissions,
    loadingTeamAccess,
    missingRequiredPermission,
    teamAccessError,
    isTeamScopedRole,
    location.pathname,
    navigate,
    onboardingPath,
    pricingPath,
    isBillingSuccess,
    context,
  ]);

  if (!initialized) {
    return <LoadingSpinner />; // Show spinner during initialization
  }

  if (!authenticated) {
    return <Navigate to="/Login" replace state={{ from: location }} />;
  }

  // CRITICAL: Wait for profile to load before rendering anything
  // This prevents the dashboard from rendering while we're still fetching the user's role
  // Also wait if MFA was just completed
  if (waitingForProfile) {
    return <LoadingSpinner />;
  }

  // Profile still absent after the timeout — redirect to login rather than
  // spinning forever. This handles the edge case where the profile fetch
  // permanently fails after MFA completion.
  if (!profile) {
    return <Navigate to="/Login" replace state={{ from: location }} />;
  }

  if (
    requiredPermissions?.length &&
    isTeamScopedRole &&
    (loadingTeamAccess || context === null)
  ) {
    return <LoadingSpinner />;
  }

  // Show loading spinner during role check and redirect
  if (allowedRoles && !allowedRoles.some((r) => effectiveRoles.includes(r))) {
    return <LoadingSpinner />;
  }

  if (
    requiredPermissions?.length &&
    isTeamScopedRole &&
    missingRequiredPermission
  ) {
    return <LoadingSpinner />;
  }

  // Show loading spinner during onboarding redirect
  if (
    onboardingPath &&
    isOnboardingIncomplete(profile) &&
    location.pathname !== onboardingPath.split("?")[0]
  ) {
    return <LoadingSpinner />;
  }

  // Show loading spinner during pricing redirect
  // Skip if this is a billing success redirect
  if (
    pricingPath &&
    !isBillingSuccess &&
    location.pathname !== "/brandpricing"
  ) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
