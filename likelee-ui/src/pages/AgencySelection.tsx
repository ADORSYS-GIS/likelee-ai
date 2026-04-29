import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthProvider";
import {
  getDashboardPath,
  getOnboardingPath,
  getOrganizationSignupPathForType,
  getSignupPathForRole,
  isOnboardingIncomplete,
} from "@/auth/onboarding";

export default function AgencySelection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { initialized, authenticated, profile, user } = useAuth();
  const isSignupMode = React.useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("mode") === "signup";
  }, [location.search]);

  React.useEffect(() => {
    if (!initialized || !authenticated) return;
    if (!profile) {
      const role = String(
        user?.user_metadata?.role || user?.app_metadata?.role || "",
      )
        .trim()
        .toLowerCase();
      if (role === "creator" || role === "brand" || role === "agency") {
        navigate(getSignupPathForRole(role), { replace: true });
      }
      return;
    }
    const path = isOnboardingIncomplete(profile)
      ? getOnboardingPath(profile)
      : getDashboardPath(profile);
    if (path) {
      navigate(path, { replace: true });
    }
  }, [authenticated, initialized, navigate, profile, user]);

  const items = [
    {
      title: t("talentModelingAgency"),
      desc: t("talentModelingAgencyMessage"),
      icon: Users,
      to: isSignupMode
        ? getOrganizationSignupPathForType("talent_agency")
        : createPageUrl("TalentAgency"),
    },
    {
      title: t("sportsAgency"),
      desc: t("sportsAgencyMessage"),
      icon: Trophy,
      to: isSignupMode
        ? getOrganizationSignupPathForType("sports_agency")
        : createPageUrl("SportsAgency"),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 pt-20 pb-10">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            {t("whatTypeOfAgencyAreYou")}
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            {t("whatTypeOfAgencyAreYouMessage")}
          </p>
        </div>
      </section>
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2 justify-center">
          {items.map(({ title, desc, icon: Icon, to }) => (
            <Card
              key={title}
              className="p-8 border-2 border-black rounded-none bg-white flex flex-col"
            >
              <div className="flex flex-col items-center text-center gap-4 flex-1">
                <div className="w-14 h-14 bg-gray-900 text-white flex items-center justify-center">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <p className="text-gray-600 text-sm md:text-base flex-1">{desc}</p>
                <Button
                  onClick={() => navigate(to)}
                  className="mt-4 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white border-2 border-black rounded-none w-full font-bold h-12"
                >
                  {t("organizationSignup.selectAndContinue")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
