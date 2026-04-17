import React from "react";
import { Clock, Zap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TrialCountdownBannerProps {
  trialEndsAt: string | null;
  onUpgrade?: () => void;
}

export function TrialCountdownBanner({
  trialEndsAt,
  onUpgrade,
}: TrialCountdownBannerProps) {
  const navigate = useNavigate();
  const [daysLeft, setDaysLeft] = React.useState<number | null>(null);
  const [hoursLeft, setHoursLeft] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!trialEndsAt) {
      setDaysLeft(null);
      setHoursLeft(null);
      return;
    }

    const updateCountdown = () => {
      const endDate = new Date(trialEndsAt);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setDaysLeft(0);
        setHoursLeft(0);
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );

      setDaysLeft(days);
      setHoursLeft(hours);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [trialEndsAt]);

  if (daysLeft === null || daysLeft < 0) return null;

  const isUrgent = daysLeft <= 3;
  const isExpired = daysLeft === 0 && hoursLeft === 0;

  if (isExpired) {
    return (
      <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50 p-6 mb-6 shadow-lg shadow-red-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gradient-to-br from-red-500 to-rose-600 p-3 shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900">
                Your free trial has ended
              </h3>
              <p className="text-sm text-red-700 mt-0.5">
                Subscribe now to continue using all features and keep your data
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/brandpricing")}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-lg"
          >
            Subscribe Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 p-5 mb-6 shadow-lg ${
        isUrgent
          ? "border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 shadow-amber-100"
          : "border-[#B8E6E4] bg-gradient-to-r from-[#EDFAF8] via-white to-[#E5F9F5] shadow-[#18B1AE]/10"
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-full p-3 shadow-lg ${
              isUrgent
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-[#18B1AE] to-[#14A3A0]"
            }`}
          >
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3
                className={`text-lg font-bold ${
                  isUrgent ? "text-amber-900" : "text-[#107573]"
                }`}
              >
                Free Trial Active
              </h3>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
                  isUrgent
                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                    : "bg-[#E5F9F5] text-[#18A7A5] border border-[#B8E6E4]"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isUrgent ? "bg-amber-500 animate-ping" : "bg-[#18B1AE]"
                  }`}
                />
                {daysLeft} {daysLeft === 1 ? "day" : "days"}{" "}
                {hoursLeft !== null && hoursLeft > 0 && `${hoursLeft}h`} left
              </div>
            </div>
            <p
              className={`text-sm ${
                isUrgent ? "text-amber-700 font-medium" : "text-[#18A7A5]"
              }`}
            >
              {isUrgent
                ? "⚡ Your card will be charged soon — upgrade or cancel anytime"
                : "✓ Enjoy full access — your card will be charged automatically when trial ends"}
            </p>
          </div>
        </div>

        {isUrgent && (
          <Button
            onClick={onUpgrade || (() => navigate("/brandpricing"))}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold shadow-lg"
          >
            Upgrade Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
