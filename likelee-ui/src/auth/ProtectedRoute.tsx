import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { initialized, authenticated, profile } = useAuth();
  const location = useLocation();

  if (!initialized) return null;

  if (!authenticated) {
    return <Navigate to="/Login" replace state={{ from: location }} />;
  }

  // Check for role-based access if allowedRoles is provided
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/Unauthorized" replace />;
  }

  // Redirect incomplete onboarding to signup
  if (
    profile &&
    profile.onboarding_step === 'email_verification' &&
    location.pathname !== '/organization-signup'
  ) {
    return <Navigate to="/organization-signup" replace />;
  }

  return <>{children}</>;
}
