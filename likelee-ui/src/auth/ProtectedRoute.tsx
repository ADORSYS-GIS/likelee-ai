import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

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
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { initialized, authenticated, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle role-based redirect with useEffect to prevent content flash
  React.useEffect(() => {
    if (initialized && authenticated && profile) {
      // Check for role-based access
      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        navigate("/Unauthorized", { replace: true });
        return;
      }

      // Redirect incomplete onboarding to signup
      if (
        profile.onboarding_step === "email_verification" &&
        location.pathname !== "/organization-signup"
      ) {
        navigate("/organization-signup", { replace: true });
      }
    }
  }, [
    initialized,
    authenticated,
    profile,
    allowedRoles,
    location.pathname,
    navigate,
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

  // Show loading spinner during role check and redirect
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <LoadingSpinner />;
  }

  // Show loading spinner during onboarding redirect
  if (
    profile.onboarding_step === "email_verification" &&
    location.pathname !== "/organization-signup"
  ) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
