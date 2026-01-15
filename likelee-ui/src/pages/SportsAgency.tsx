import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  DollarSign,
  Users,
  Shield,
  Calendar,
  TrendingUp,
} from "lucide-react";
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

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 py-20 overflow-hidden bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            {t("turnAthletesYearRoundEarners")}
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            {t("nilLicensingGrows")}
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            {t("traditionalEndorsementsPayOnce")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              {t("bookDemo")}
            </Button>
            <Button
              onClick={() => navigate(`${createPageUrl("OrganizationSignup")}?type=sports_agency`)}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all border-2 border-gray-200"
            >
              {t("getStarted")}
            </Button>
            <Button
              onClick={scrollToHowItWorks}
              className="h-12 px-10 text-lg font-medium bg-transparent hover:bg-white/10 text-white rounded-md transition-all border-2 border-white"
            >
              {t("seeHowItWorks")}
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: Endorsement Deals Aren't Enough Anymore */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {t("endorsementDealsNotEnough")}
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            {t("endorsementDealsNotEnoughDescription")}
          </p>
        </div>
      </section>

      {/* Section 2: Two NIL Revenue Streams */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("twoNILRevenueStreams")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Fixed-Term NIL Licensing */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-16 h-16 bg-green-600 flex items-center justify-center mb-6">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("fixedTermNILLicensing")}
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                {t("fixedTermNILLicensingDescription1")}
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("fixedTermNILLicensingDescription2")}
              </p>
            </Card>

            {/* Recurring Monthly NIL */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-16 h-16 bg-green-600 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("recurringMonthlyNIL")}
              </h3>
              <p className="text-base text-gray-700 mb-6 leading-relaxed">
                {t("recurringMonthlyNILDescription1")}
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("recurringMonthlyNILDescription2")}.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 3: The Math */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("theMathSports")}
            </h2>
          </div>

          <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("scenario")}
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("traditional")}
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-[#32C8D1]">
                      {t("likelee")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      {t("sportsDrinkEndorsement")}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {t("sportsDrinkEndorsementBefore")}
                    </td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      {t("sportsDrinkEndorsementAfter")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      {t("recurringBrandPartnership")}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {t("recurringBrandPartnershipBefore")}
                    </td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      {t("recurringBrandPartnershipAfter")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-gray-700">
                      {t("apparelBrandNILLicensing")}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {t("apparelBrandNILLicensingBefore")}
                    </td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      {t("apparelBrandNILLicensingAfter")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-center text-xl font-semibold text-gray-900 mt-8">
            {t("sameAthleteMultipleStreams")}{" "}
            <span className="text-[#32C8D1]">{t("moreEarningPotential")}</span>
          </p>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section id="how-it-works" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("howItWorksSports")}
            </h2>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksSportsStep1")}
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksSportsStep2")}
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksSportsStep3")}
              </p>
            </Card>

            {/* Step 4 */}
            <Card className="p-4 md:p-5 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksSportsStep4")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: Why Sports Agencies Win */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("whySportsAgenciesWin")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Diversified Athlete Income */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <DollarSign className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("diversifiedAthleteIncome")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                {t("diversifiedAthleteIncomeDescription1")}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("diversifiedAthleteIncomeDescription2")}
              </p>
            </Card>

            {/* Athletes Stay Because They're Protected */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Users className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("athletesStayProtected")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("athletesStayProtectedDescription")}
              </p>
            </Card>

            {/* Full Compliance and Control */}
            <Card className="p-10 md:p-12 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Shield className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("fullComplianceControl")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("fullComplianceControlDescription")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 6: Verified Athlete Access */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("verifiedAthleteAccess")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* What You Get */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {t("whatYouGet")}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    {t("verifiedIdentity")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    {t("confirmedNILOwnership")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    {t("preClearedLicensing")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    {t("oneClickLicensing")}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                  <p className="text-base text-gray-700">
                    {t("repeatableUsage")}
                  </p>
                </div>
              </div>
            </Card>

            {/* Why It Matters */}
            <Card className="p-8 md:p-10 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {t("whyItMatters")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("whyItMattersDescription")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20 bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("adaptOrWatch")}
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            {t("adaptOrWatchDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              {t("bookADemo")}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Faces"))}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              {t("exploreAthleteMarketplace")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
