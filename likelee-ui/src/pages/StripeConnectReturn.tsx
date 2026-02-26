import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

const StripeConnectReturn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { profile, authenticated, initialized, refreshToken, refreshProfile } =
    useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const mode = searchParams.get("mode") || "AI";
    if (!initialized) return;

    let cancelled = false;

    const ensureFreshAuth = async () => {
      setRefreshing(true);
      try {
        await refreshToken();
        await refreshProfile();
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };

    ensureFreshAuth();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  useEffect(() => {
    const mode = searchParams.get("mode") || "AI";
    if (!initialized) return;
    if (refreshing) return;

    if (!authenticated || !profile?.role) {
      navigate("/Login", { replace: true, state: { from: location } });
      return;
    }

    if (profile.role === "agency") {
      navigate(
        `/AgencyDashboard?mode=${encodeURIComponent(mode)}&tab=accounting&subTab=${encodeURIComponent(
          "Connect Bank",
        )}`,
        { replace: true },
      );
      return;
    }

    if (profile.role === "creator" || profile.role === "talent") {
      navigate("/CreatorDashboard", { replace: true });
      return;
    }

    if (profile.role === "brand") {
      navigate("/BrandDashboard", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  }, [
    navigate,
    searchParams,
    profile,
    authenticated,
    initialized,
    refreshing,
    location,
  ]);

  if (!initialized || refreshing) {
    return (
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
  }

  return null;
};

export default StripeConnectReturn;
