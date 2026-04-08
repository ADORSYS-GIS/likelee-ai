import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { getOnboardingPath, isOnboardingIncomplete } from "./onboarding";
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

  const effectiveRoles = React.useMemo(() => {
    if (!profile?.role) return [];
    if (profile.role === "talent") return ["talent", "creator"];
    return [profile.role];
  }, [profile?.role]);
  const onboardingPath = React.useMemo(
    () => getOnboardingPath(profile),
    [profile],
  );
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
  if (!profile) {
    return <LoadingSpinner />;
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

  return <>{children}</>;
}
