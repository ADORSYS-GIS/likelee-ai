import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Users, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MarketingAgency() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: t("marketingAgencySolutions"),
      description: t("marketingAgencySolutionsDescription"),
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: t("marketingAgencyCreatorPlatform"),
      areaServed: t("worldwide"),
      audience: {
        "@type": "Audience",
        audienceType: t("marketingCreativeAgencies"),
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
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">
            {t("onePlatformForAICampaigns")}
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              {t("bookDemo")}
            </Button>
            <Button
              onClick={() =>
                navigate(
                  `${createPageUrl("OrganizationSignup")}?type=marketing_agency`,
                )
              }
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

      {/* Section 1: The Problem We Solve */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {t("theProblemWeSolve")}
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            {t("theProblemWeSolveDescription")}
          </p>
        </div>
      </section>

      {/* Section 2: Three Things Likelee Does */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("threeThingsLikeleeDoes")}
            </h2>
          </div>

          <div className="space-y-8">
            {/* Verified Creator Licensing Marketplace */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("verifiedCreatorLicensingMarketplace")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("verifiedCreatorLicensingMarketplaceDescription")}
              </p>
            </Card>

            {/* Streamlined AI Campaign Workflow */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("streamlinedAICampaignWorkflow")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("streamlinedAICampaignWorkflowDescription")}
              </p>
            </Card>

            {/* Direct Brand Exposure */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("directBrandExposure")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("directBrandExposureDescription")}
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
              {t("theMath")}
            </h2>
          </div>

          <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("challenge")}
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      {t("before")}
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-[#32C8D1]">
                      {t("after")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      {t("licensingComplianceTime")}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {t("licensingComplianceTimeBefore")}
                    </td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      {t("licensingComplianceTimeAfter")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      {t("campaignsPerTeamPerMonth")}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {t("campaignsPerTeamPerMonthBefore")}
                    </td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      {t("campaignsPerTeamPerMonthAfter")}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-gray-700">
                      {t("timeToDeliverAICampaign")}
                    </td>
                    <td className="py-4 px-4 text-gray-700">
                      {t("timeToDeliverAICampaignBefore")}
                    </td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      {t("timeToDeliverAICampaignAfter")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-center text-xl font-semibold text-gray-900 mt-8">
            {t("sameTeam")}{" "}
            <span className="text-[#32C8D1]">
              {t("moreCampaignsBetterMargins")}
            </span>
          </p>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section id="how-it-works" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("howItWorksMarketing")}
            </h2>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksStep1")}
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksStep2")}
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksStep3")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 5: Why Marketing Agencies Win */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("whyMarketingAgenciesWin")}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Operational Simplicity */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Users className="w-12 h-12 text-[#32C8D1]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("operationalSimplicity")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("operationalSimplicityDescription")}
              </p>
            </Card>

            {/* Faster AI Campaign Delivery */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Clock className="w-12 h-12 text-[#32C8D1]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("fasterAICampaignDelivery")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("fasterAICampaignDeliveryDescription")}
              </p>
            </Card>

            {/* New Business From Brands Moving to AI */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <TrendingUp className="w-12 h-12 text-[#32C8D1]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("newBusinessFromBrands")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("newBusinessFromBrandsDescription")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20 bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("leadAICampaigns")}
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            {t("leadAICampaignsDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              {t("bookADemo")}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Landing"))}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              {t("seePlatformLive")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
