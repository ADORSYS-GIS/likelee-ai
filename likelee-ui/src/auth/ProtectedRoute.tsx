import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialized, authenticated } = useAuth();
  const location = useLocation();

  if (!initialized) return null;
  if (!authenticated)
    return <Navigate to="/Login" replace state={{ from: location }} />;
  return <>{children}</>;
}
