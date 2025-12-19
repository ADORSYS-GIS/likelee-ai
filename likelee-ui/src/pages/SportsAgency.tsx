import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Users,
  Shield,
  Target,
  CheckCircle2,
  Zap,
  BarChart3,
  Rocket,
  Award,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function SportsAgency() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
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
              onClick={scrollToHowItWorks}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
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

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
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

            <Card className="p-8 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-600 rounded-none">
              <Zap className="w-10 h-10 text-emerald-600 mb-4" />
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

          <Card className="p-10 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black rounded-none text-center shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4">
                <TrendingUp className="w-12 h-12 text-yellow-300" />
                <p className="text-3xl font-bold text-white">
                  Your athletes earn more.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Users className="w-12 h-12 text-yellow-300" />
                <p className="text-3xl font-bold text-white">
                  Your team doesn't grow.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Award className="w-12 h-12 text-yellow-300" />
                <p className="text-3xl font-bold text-white">
                  You capture a revenue stream competitors haven't figured out
                  yet.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-teal-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl rounded-none">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Register</h3>
              <div className="space-y-2 text-gray-700">
                <p>→ Upload verified athlete data</p>
                <p>→ Government ID verification</p>
                <p>→ Liveness check</p>
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

            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-teal-600 border-2 border-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("athletesStayProtected")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("athletesStayProtectedDescription")}
              </p>
            </Card>

            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black flex items-center justify-center mb-6 shadow-lg rounded-none">
                <span className="text-3xl font-bold text-white">3</span>
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

      {/* Section 4: Real Results */}
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
              </div>
            </Card>

            <Card className="p-10 bg-gradient-to-br from-emerald-600 to-green-600 border-2 border-black rounded-none shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-12 h-12 text-yellow-300" />
                <h3 className="text-2xl font-bold text-white">
                  50+ Athlete National Agency
                </h3>
              </div>
              <div className="space-y-4">
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
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <Card className="p-8 md:p-10 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          {t("whyItMatters")}
        </h3>
        <p className="text-base text-gray-700 leading-relaxed">
          {t("whyItMattersDescription")}
        </p>
      </Card>
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
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            Ready to Scale AI-Powered Likeness Licensing?
          </h2>
          <Card className="p-8 bg-white/10 backdrop-blur-sm border-2 border-white rounded-none mb-10">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <DollarSign className="w-10 h-10 text-yellow-300" />
                <p className="text-2xl font-bold text-white">
                  Your athletes have a revenue stream most agencies aren't
                  offering yet.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Award className="w-10 h-10 text-yellow-300" />
                <p className="text-2xl text-white">
                  Let's talk about bringing your roster live.
                </p>
              </div>
            </div>
          </Card>
          <Button
            onClick={() => navigate(createPageUrl("SalesInquiry"))}
            className="h-20 px-14 text-xl font-bold bg-white hover:bg-gray-100 text-emerald-600 border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Book a Demo
          </Button>
        </div>
      </section>
    </div>
  );
}
