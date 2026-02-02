import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const StripeConnectRefresh: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get("mode") || "AI";
    navigate(
      `/AgencyDashboard?mode=${encodeURIComponent(mode)}&tab=accounting&subTab=${encodeURIComponent(
        "Connect Bank",
      )}`,
      { replace: true },
    );
  }, [navigate, searchParams]);

  return null;
};

export default StripeConnectRefresh;
