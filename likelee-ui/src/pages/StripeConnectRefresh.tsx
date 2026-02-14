import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

const StripeConnectRefresh: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, authenticated, initialized } = useAuth();

  useEffect(() => {
    const mode = searchParams.get("mode") || "AI";
    if (!initialized) return;

    if (!authenticated || !profile?.role) {
      navigate("/Login", { replace: true });
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
  }, [navigate, searchParams, profile, authenticated, initialized]);

  return null;
};

export default StripeConnectRefresh;
