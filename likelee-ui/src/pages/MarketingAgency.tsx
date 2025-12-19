import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  Users,
  Zap,
  CheckCircle2,
  TrendingUp,
  Clock,
  Globe,
  FileCheck,
  Award,
  Eye,
  Target,
} from "lucide-react";
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
              onClick={scrollToHowItWorks}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              {t("seeHowItWorks")}
            </Button>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
            <p className="text-xl text-gray-900 mb-4">
              <span className="font-bold">Result:</span> You're spending 40% of
              your time on logistics. Your team is burned out. Your margins are
              shrinking.
            </p>
            <p className="text-2xl font-bold text-[#32C8D1]">
              Likelee changes that.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 3: Your Gateway to AI-Powered Campaigns */}
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

      {/* Section 5: How Likelee Works For Agencies */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("threeThingsLikeleeDoes")}
            </h2>
            <p className="text-xl text-gray-600">From Chaos to System</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("verifiedCreatorLicensingMarketplace")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("verifiedCreatorLicensingMarketplaceDescription")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("streamlinedAICampaignWorkflow")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("streamlinedAICampaignWorkflowDescription")}
              </p>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("directBrandExposure")}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {t("directBrandExposureDescription")}
              </p>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center mt-12">
            <p className="text-xl text-white font-semibold">
              Everyone wins. You own the relationship. Likelee handles the
              complexity.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 6: Your Workflow */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Your Workflow
            </h2>
            <p className="text-xl text-gray-600">
              Three Steps to Campaign Done
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Client Submits Brief
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Your client describes what they need: "5 Instagram Reels
                featuring [niche] creators" or "30-second commercial with
                athlete testimonial."
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                You Find Talent on Likelee
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Search verified creators by niche, follower count, past work
                quality. Or use AI Talent for rapid production. Select 5
                creators. Submit briefs. They respond within 24 hours.
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                You Deliver to Client
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Approved deliverables come back with full licensing embedded.
                You hand it off. Royalties are tracked automatically. Done.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 7: Real Agency Wins */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Agency Wins
            </h2>
            <p className="text-xl text-gray-600">
              What Agencies Are Actually Getting
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Boutique Social Agency
              </h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p>
                  <span className="font-bold">Used to:</span> Hunt for
                  micro-influencers via Instagram, negotiate contracts, manage
                  payments
                </p>
                <p>
                  <span className="font-bold">Now:</span> Search Likelee
                  marketplace, book 10 creators in 30 minutes, get deliverables
                  in 3 days
                </p>
                <p className="text-[#32C8D1] font-bold">
                  <span className="text-gray-900">Result:</span> Delivered
                  campaign 2 weeks faster. Client renewed contract.
                </p>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Mid-Sized Digital Agency
              </h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p>
                  <span className="font-bold">Used to:</span> Manage separate
                  vendors for creators, AI video, compliance, royalty tracking
                </p>
                <p>
                  <span className="font-bold">Now:</span> Everything on one
                  platform. License verified faces. Generate AI content.
                  Approve. Deliver.
                </p>
                <p className="text-[#32C8D1] font-bold">
                  <span className="text-gray-900">Result:</span> Cut production
                  time by 40%. Handling 3x more campaigns with same team.
                </p>
              </div>
            </Card>

            <Card className="p-8 md:p-12 bg-white border-2 border-black rounded-none">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Full-Service Studio
              </h3>
              <div className="space-y-4 text-lg text-gray-700">
                <p>
                  <span className="font-bold">Used to:</span> Build in-house AI
                  tools, hire editors, manage creator relationships manually
                </p>
                <p>
                  <span className="font-bold">Now:</span> White-label Likelee
                  Studio. Resell as "Agency Creative Studio" to clients
                </p>
                <p className="text-[#32C8D1] font-bold">
                  <span className="text-gray-900">Result:</span> New revenue
                  stream. 25% margin on every campaign.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 8: The Compliance Angle */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("theMath")}
            </h2>
            <p className="text-xl text-gray-600">
              Your Clients Sleep Well. So Do You.
            </p>
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

      {/* Section 11: What You Get */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("howItWorksMarketing")}
            </h2>
            <p className="text-xl text-gray-600">
              The Platform Handles Everything So You Can Focus on Your Client
            </p>
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

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">
                  Direct Brand Exposure
                </h3>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksStep2")}
              </p>
            </Card>

            <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <h3 className="font-bold text-gray-900">
                  Escrow-Protected Payments
                </h3>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                {t("howItWorksStep3")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 12: How to Get Started */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("whyMarketingAgenciesWin")}
            </h2>
            <p className="text-xl text-gray-600">Ready to Scale?</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("operationalSimplicity")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("operationalSimplicityDescription")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("fasterAICampaignDelivery")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("fasterAICampaignDeliveryDescription")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 mx-auto">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("newBusinessFromBrands")}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {t("newBusinessFromBrandsDescription")}
              </p>
            </Card>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center">
            <p className="text-xl text-white font-semibold">
              We help agencies manage this transition. Onboarding support
              included.
            </p>
          </Card>
        </div>
      </section>

      {/* Section 13: FAQ */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How does agency pricing work?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Monthly subscription starts at $149 (Starter) or $449 (Pro). You
                pay for access to the marketplace, studio tools, and compliance
                infrastructure. Metered add-ons for extra usage.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Do I need to manage contracts with creators?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                No. Likelee handles contracts. You select creators, submit
                briefs, creators approve. Likelee manages licensing, payments,
                compliance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I white-label this for my clients?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Enterprise plan includes white-label studio portal. Resell
                as your own creative studio.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if a client dispute comes up?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Likelee mediates. We have a dispute resolution process. Most are
                resolved within 48 hours.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I integrate Likelee with my existing tools?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Enterprise plan includes API access. Integrate with your project
                management, billing, or CRM.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-6"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How do I charge my clients?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                You set your own pricing. Typical markups: 25–50% on Likelee
                subscription costs + creator licensing fees. Agencies manage
                client billing separately.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-7"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What kind of support do I get?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Starter: Email support. Pro: 48h priority support. Enterprise:
                Dedicated CSM + phone support.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Section 14: CTA */}
      <section className="px-6 py-24 bg-gradient-to-r from-[#32C8D1] to-teal-500">
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
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-white hover:bg-gray-100 text-[#32C8D1] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              {t("bookADemo")}
            </Button>
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("OrganizationSignup") +
                    "?type=marketing_agency",
                )
              }
              variant="outline"
              className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-none"
            >
              {t("seePlatformLive")}
            </Button>
          </div>
          <p className="text-cyan-100 mt-6 text-sm">
            See it in action. 30 minutes. See how 3 campaigns could work.
          </p>
        </div>
      </section>
    </div>
  );
}
