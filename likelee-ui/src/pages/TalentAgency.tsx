import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Shield,
  Users,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TalentAgency() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Talent & Modeling Agency Solutions",
      description:
        "License your models' likenesses. Earn recurring revenue from the same photos and faces—year after year.",
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: "Talent Agency Licensing Platform",
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "Talent Agencies, Modeling Agencies",
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 py-20 overflow-hidden bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            {t("talentAgency.hero.title")}
          </h1>
          <p className="text-lg md:text-xl font-semibold mb-4">
            {t("talentAgency.hero.subtitle")}
          </p>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            {t("talentAgency.hero.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"
            >
              {t("talentAgency.hero.cta")}
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `${createPageUrl("OrganizationSignup")}?type=talent_agency`,
                )
              }
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all border-2 border-gray-200"
            >
              {t("getStarted")}
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: Bookings are dropping */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {t("talentAgency.bookingsDropping.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            {t("talentAgency.bookingsDropping.description")}
          </p>
        </div>
      </section>

      {/* Section 2: Two Ways to Earn */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("talentAgency.twoWays.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Recurring Monthly Licensing */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black shadow-xl rounded-none flex flex-col">
              <div className="w-16 h-16 bg-indigo-600 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("talentAgency.twoWays.recurring.title")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("talentAgency.twoWays.recurring.description")}{" "}
                <span className="font-bold text-indigo-600">
                  {t("talentAgency.twoWays.recurring.highlight")}
                </span>{" "}
                {t("talentAgency.twoWays.recurring.suffix")}
              </p>
            </Card>

            {/* Fixed-Term Licensing */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black shadow-xl rounded-none flex flex-col">
              <div className="w-16 h-16 bg-purple-600 flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("talentAgency.twoWays.fixed.title")}
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                {t("talentAgency.twoWays.fixed.description")}{" "}
                <span className="font-bold text-purple-600">
                  {t("talentAgency.twoWays.fixed.highlight")}
                </span>
                {t("talentAgency.twoWays.fixed.suffix")}
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("talentAgency.twoWays.fixed.example")}{" "}
                <span className="font-bold text-purple-600">
                  {t("talentAgency.twoWays.fixed.exampleHighlight")}
                </span>{" "}
                {t("talentAgency.twoWays.fixed.exampleSuffix")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section id="how-it-works" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("talentAgency.howItWorks.title")}
            </h2>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step1")}
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step2")}
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step3")}
              </p>
            </Card>

            {/* Step 4 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("talentAgency.howItWorks.step4")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 4: Why Agencies Win */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("talentAgency.whyAgenciesWin.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Recurring Revenue That Scales */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <DollarSign className="w-12 h-12 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("talentAgency.whyAgenciesWin.revenue.title")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("talentAgency.whyAgenciesWin.revenue.description")}
              </p>
            </Card>

            {/* Talent Stays Because They Feel Secure */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Users className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("talentAgency.whyAgenciesWin.retention.title")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("talentAgency.whyAgenciesWin.retention.description")}
              </p>
            </Card>

            {/* Legal Protection Built In */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Shield className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("talentAgency.whyAgenciesWin.protection.title")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("talentAgency.whyAgenciesWin.protection.description")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20 bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("talentAgency.cta.title")}
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            {t("talentAgency.cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all"
            >
              {t("talentAgency.cta.bookDemo")}
            </Button>
            <Button
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              {t("talentAgency.cta.howItWorks")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
