import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { hasBrandStudioAccess } from "@/lib/brandBilling";

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="text-center">
      <div
        className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#32C8D1] border-r-transparent align-[-0.125em]"
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

export default function BrandStudioAddonRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const { initialized, authenticated, profile } = useAuth();

  if (!initialized) {
    return <LoadingSpinner />;
  }

  if (!authenticated) {
    return <>{children}</>;
  }

  if (!profile) {
    return <LoadingSpinner />;
  }

  if (profile.role !== "brand" || hasBrandStudioAccess(profile)) {
    return <>{children}</>;
  }

  const nextPath = `${location.pathname}${location.search}${location.hash}`;
  return (
    <Navigate
      to={`/brandpricing?focus=studio&next=${encodeURIComponent(nextPath)}`}
      replace
    />
  );
}
