import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { getPayoutsAccountStatus, createPayoutsOnboardingLink } from "@/api/functions";

export default function PayoutsStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    connected: boolean;
    payouts_enabled: boolean;
    transfers_enabled: boolean;
    last_error?: string;
  } | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.id) throw new Error("Not authenticated");
      const s = await getPayoutsAccountStatus(user.id);
      setStatus(s as any);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const restartOnboarding = async () => {
    try {
      if (!user?.id) throw new Error("Not authenticated");
      const res = await createPayoutsOnboardingLink(user.id);
      if ((res as any)?.url) window.location.href = (res as any).url;
    } catch (e) {
      setError("Could not start onboarding. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Payouts Status</h1>
          <Button variant="outline" onClick={() => navigate("/CreatorDashboard")}>Back</Button>
        </div>

        <Card className="p-6 bg-white border-2 border-black rounded-none">
          {loading && <div>Loading status...</div>}
          {error && <div className="text-red-600">{error}</div>}

          {!loading && !error && status && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-gray-700">Connected to Stripe</div>
                <div className={`font-semibold ${status.connected ? "text-green-700" : "text-gray-600"}`}>
                  {status.connected ? "Yes" : "No"}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-gray-700">Payouts Enabled</div>
                <div className={`font-semibold ${status.payouts_enabled ? "text-green-700" : "text-gray-600"}`}>
                  {status.payouts_enabled ? "Yes" : "No"}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-gray-700">Transfers Enabled</div>
                <div className={`font-semibold ${status.transfers_enabled ? "text-green-700" : "text-gray-600"}`}>
                  {status.transfers_enabled ? "Yes" : "No"}
                </div>
              </div>
              {status.last_error && (
                <div className="text-sm text-amber-700">Last issue: {status.last_error}</div>
              )}

              <div className="pt-4 flex gap-3">
                {!status.connected && (
                  <Button className="bg-emerald-600" onClick={restartOnboarding}>
                    Connect Bank Account
                  </Button>
                )}
                <Button variant="outline" onClick={refresh}>
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
