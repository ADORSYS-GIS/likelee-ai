import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SportsAgency() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: t("sportsAgencySolutions"),
      description: t("sportsAgencySolutionsDescription"),
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: t("sportsAgencyNILPlatform"),
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: t("sportsAgenciesAthleteReps"),
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
      <section className="relative px-6 py-24 overflow-hidden bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 whitespace-pre-line">
            {t("turnAthletesYearRoundEarners")}
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold mb-6 text-gray-200">
            {t("nilLicensingGrows")}
          </h2>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto">
            {t("traditionalEndorsementsPayOnce")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-14 px-12 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-none transition-all border-2 border-green-600"
            >
              {t("bookDemo")}
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `${createPageUrl("OrganizationSignup")}?type=sports_agency`,
                )
              }
              className="h-14 px-12 text-lg font-semibold bg-white hover:bg-gray-50 text-gray-900 rounded-none transition-all border-2 border-gray-300"
            >
              {t("getStarted")}
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900">
              {t("howItWorksSports")}
            </h2>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-white border border-black rounded-none shadow-sm flex items-start gap-6">
              <div className="w-10 h-10 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">1</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t("howItWorksSportsStep1Title")}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {t("howItWorksSportsStep1")}
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-black rounded-none shadow-sm flex items-start gap-6">
              <div className="w-10 h-10 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">2</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t("howItWorksSportsStep2Title")}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {t("howItWorksSportsStep2")}
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-black rounded-none shadow-sm flex items-start gap-6">
              <div className="w-10 h-10 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">3</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t("howItWorksSportsStep3Title")}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {t("howItWorksSportsStep3")}
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-white border border-black rounded-none shadow-sm flex items-start gap-6">
              <div className="w-10 h-10 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">4</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t("howItWorksSportsStep4Title")}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {t("howItWorksSportsStep4")}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Endorsement Deals Aren't Enough Anymore */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("endorsementDealsNotEnough")}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            {t("endorsementDealsNotEnoughDescription")}
          </p>
        </div>
      </section>

      {/* Dark CTA Strip */}
      <section className="px-6 py-16 bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-14 px-12 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-none transition-all border-2 border-green-600"
            >
              {t("bookADemo")}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Faces"))}
              className="h-14 px-12 text-lg font-semibold bg-white hover:bg-gray-50 text-gray-900 rounded-none transition-all border-2 border-gray-300"
            >
              {t("exploreAthleteMarketplace")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
