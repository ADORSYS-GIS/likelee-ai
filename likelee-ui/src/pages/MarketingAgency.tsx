import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Users, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MarketingAgency() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Marketing Agency Solutions",
      description:
        "One platform for AI-powered creator campaigns. Verified creator licensing, production workflows, compliance, and brand exposure.",
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: "Marketing Agency Creator Platform",
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "Marketing Agencies, Creative Agencies",
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
            One Platform For AI-Powered Creator Campaigns
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              Book Demo
            </Button>
            <Button
              onClick={scrollToHowItWorks}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Section 1: The Problem We Solve */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            The Problem We Solve
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            Your clients are moving to AI-powered creator content. Your team is
            juggling multiple vendors and platforms to source, manage, and
            deliver these campaigns. Likelee consolidates everything— verified
            creator licensing, production workflows, compliance, and brand
            exposure—into one streamlined platform so you deliver AI campaigns
            faster without building infrastructure.
          </p>
        </div>
      </section>

      {/* Section 2: Three Things Likelee Does */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Three Things Likelee Does
            </h2>
          </div>

          <div className="space-y-8">
            {/* Verified Creator Licensing Marketplace */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Verified Creator Licensing Marketplace
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                Browse pre-verified creators already cleared for AI-powered
                commercial campaigns. License their likeness for AI content
                production. No hunting. No vetting. Everything's pre-cleared.
                Your sourcing goes from weeks to minutes.
              </p>
            </Card>

            {/* Streamlined AI Campaign Workflow */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Streamlined AI Campaign Workflow
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                Brief → License creators → Manage AI production → Approve
                deliverables → Client handoff. Same workflow your team knows.
                3-5 day turnaround. All creator licensing embedded in final
                assets.
              </p>
            </Card>

            {/* Direct Brand Exposure */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Direct Brand Exposure
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                Brands discover your agency on Likelee when searching for AI
                campaign partners. Inbound pipeline. New business finds you
                because you're positioned as AI-campaign ready.
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
              The Math
            </h2>
          </div>

          <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      Challenge
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-gray-900">
                      Before
                    </th>
                    <th className="text-left py-4 px-4 font-bold text-[#32C8D1]">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      Creator licensing + compliance time
                    </td>
                    <td className="py-4 px-4 text-gray-700">8 hours</td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      2 hours
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-700">
                      AI campaigns per team per month
                    </td>
                    <td className="py-4 px-4 text-gray-700">4</td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      12
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-gray-700">
                      Time to deliver AI campaign
                    </td>
                    <td className="py-4 px-4 text-gray-700">2-3 weeks</td>
                    <td className="py-4 px-4 text-[#32C8D1] font-semibold">
                      3-5 days
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-center text-xl font-semibold text-gray-900 mt-8">
            Same team.{" "}
            <span className="text-[#32C8D1]">
              3x more AI campaigns. Better margins.
            </span>
          </p>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section id="how-it-works" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Client briefs you on their AI campaign needs with brand assets
                and timeline.
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                You license verified creators and manage production all in one
                dashboard. Select creators, license their likenesses, manage AI
                production workflows, approve deliverables, track all creator
                licensing centrally.
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 md:p-6 bg-white border-2 border-black rounded-none flex flex-col md:flex-row items-start gap-6">
              <div className="w-12 h-12 bg-[#0D1B3A] flex-shrink-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Deliverables go to client with verified creator licensing fully
                embedded and documented. Done.
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
              Why Marketing Agencies Win
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Operational Simplicity */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Users className="w-12 h-12 text-[#32C8D1]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Operational Simplicity for AI Campaigns
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                One dashboard replaces five tools for managing creator-licensed
                content. Your team doesn't learn new systems. No more
                spreadsheets tracking who licensed what. No more vendor
                coordination across compliance, licensing, and production.
              </p>
            </Card>

            {/* Faster AI Campaign Delivery */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <Clock className="w-12 h-12 text-[#32C8D1]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Faster AI Campaign Delivery
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                2-3 weeks becomes 3-5 days because everything's in one place.
                Creator licensing is pre-cleared. Compliance is built in. No
                back-and-forth delays. Your clients see you as fast and capable
                of executing AI campaigns reliably.
              </p>
            </Card>

            {/* New Business From Brands Moving to AI */}
            <Card className="p-8 md:p-10 bg-white border-2 border-black rounded-none flex flex-col">
              <div className="w-12 h-12 mb-6">
                <TrendingUp className="w-12 h-12 text-[#32C8D1]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                New Business From Brands Moving to AI
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Brands actively search Likelee for agencies that can execute
                verified creator AI campaigns. You get inbound leads just by
                being on the platform. Less cold calling. More inbound from
                brands shifting to AI- powered creator content.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20 bg-[#0D1B3A] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Lead AI-Powered Creator Campaigns
          </h2>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-8">
            Likelee gives you one platform for licensing verified creators,
            managing AI production, compliance, and brand exposure. Your team
            focuses on creative strategy. Your clients get faster AI-powered
            campaigns. You operate with less overhead while positioning as an
            AI-forward agency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-12 px-10 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
            >
              Book a Demo
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("Landing"))}
              className="h-12 px-10 text-lg font-medium bg-white hover:bg-gray-100 text-gray-900 rounded-md transition-all"
            >
              See Platform Live
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
