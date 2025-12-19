import React, { useState, useEffect } from "react";
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
  Zap,
  Shield,
  DollarSign,
  Globe,
  FileCheck,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  Star,
  Award,
  Eye,
  UserCheck,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BrandCompany() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Brand & Company Campaign Solutions",
      description:
        "Launch verified talent campaigns. Project-based. Transparent pricing. No hidden costs. Access verified creators and AI filmmakers.",
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: "Brand Marketing & Creator Licensing",
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "Brands, Companies, Marketing Teams",
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
      <section className="relative px-6 pt-16 pb-8 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-4">
            Don't Lose Brand Trust Using False Avatars
          </h1>
          <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-6">
            License real athletes, influencers, and creator likenesses with
            Likelee.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("OrganizationSignup") + "?type=brand_company",
                )
              }
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium bg-gradient-to-r from-[#F7B750] to-[#FAD54C] text-white border-2 border-black shadow-xl rounded-none"
            >
              Browse Marketplace
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              variant="outline"
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium border-2 border-black rounded-none"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>
      <section className="px-6 py-20 bg-gray-50">
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
                What's the difference between a Verified Creator and an AI
                Filmmaker?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Verified Creators are real people who've licensed their likeness
                (influencers, athletes, actors, models). AI Filmmakers create
                content using AI tools (Sora, Runway, Pika, etc.). Both are
                available on Likelee.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-2"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I hire the same talent for multiple campaigns?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. If a creator's contract allows renewal, you can re-book
                them at the same rates (or renegotiate). Most creators prefer
                repeat work.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-3"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if I need revisions?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Revisions are project-to-project based on what's agreed upfront.
                Minor tweaks are usually included. Major scope changes = new
                project with new pricing.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-4"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                How long does approval take?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Most creators respond within 24 hours. Some respond within
                hours. Urgency is factored into pricing (faster turnaround =
                higher price, usually).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-5"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can you guarantee deliverables?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Talent is incentivized to deliver (they don't get paid the 50%
                on completion if they don't). If they fail to deliver, we help
                you find replacement talent or issue a refund.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-6"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What formats do you deliver?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Whatever you request: MP4, MOV, ProRes, social-optimized cuts,
                etc. Specify in the brief.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-7"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if I exceed the licensed timeframe?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                You can renew the license by re-contracting with the talent.
                Renewal is usually 20–30% of original project cost.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-8"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Is this verified consent?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Every talent on Likelee has verified their likeness rights.
                Contracts are SAG-AFTRA-aligned. You're protected.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-9"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                What if someone uses my asset without permission?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Watermarks + automated DMCA takedowns. We scan the web and issue
                takedowns automatically.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-10"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can we negotiate pricing?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Post your budget. Talent quotes back. You can
                counter-offer. It's project-based, so there's flexibility.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-11"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Can I work with my own agency on Likelee?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Invite them to manage projects. They source talent, submit
                briefs, you approve. Same transparent pricing applies.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-12"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                Are there agencies I can work with on Likelee?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                Yes. Browse Partner Agencies on Likelee. They specialize in
                different industries and can handle the entire project from
                sourcing to delivery.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
