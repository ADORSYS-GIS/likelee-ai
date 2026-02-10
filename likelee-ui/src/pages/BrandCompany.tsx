import React, { useState, useEffect } from "react";
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
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data.
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Brand Campaign Solutions",
      description: "License talent likenesses for AI content. Legally. Instantly.",
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: "Brand Marketing & Licensing",
      areaServed: "Worldwide",
      audience: {
        "@type": "Audience",
        audienceType: "Brands, Marketing Agencies, Studios",
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

  const benefits = [
    {
      icon: CheckCircle2,
      title: "Verified Consent",
      description:
        "Talent actively license their likeness—no scraping, no legal gray areas. Every permission is explicit and enforceable.",
    },
    {
      icon: Zap,
      title: "AI-Native Speed",
      description:
        "Licensed assets delivered in <48 hours. Submit your brief, get talent permissions with your AI content, automatically.",
    },
    {
      icon: Shield,
      title: "Legal Compliance Built-In",
      description:
        "Every license documents usage scope, territory, duration, and compensation. Transparent rights management with verified assets.",
    },
  ];

  const useCases = [
    {
      title: "Paid Social & Performance",
      description: "AI-generated ad creative with licensed talent for campaigns, regions, duration",
    },
    {
      title: "E-Commerce & Product",
      description: "Verified talent on product pages and campaigns",
    },
    {
      title: "OOH & Retail",
      description: "Billboard and in-store with pre-cleared rights",
    },
    {
      title: "Content & Gaming",
      description: "Integrate likenesses into brand experiences",
    },
  ];

  const howItWorksSteps = [
    "Talent or agencies set licensing terms",
    "You browse and submit your brief",
    "Talent approves in one click",
    "You receive licensed assets + binding agreement",
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-12 bg-gradient-to-br from-cyan-50 via-white to-cyan-50">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-4">
            License Talent Likenesses for AI Content.
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-[#32C8D1] to-[#2AB8C1] bg-clip-text text-transparent">
              Legally. Instantly.
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-8">
            Brand-safe AI creative with verified talent consent in &lt;48 hours. Work with
            independent talent or their agencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("OrganizationSignup") + "?type=brand_company",
                )
              }
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium bg-[#32C8D1] hover:bg-[#2AB8C1] text-white shadow-xl"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              variant="outline"
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium border-2 border-gray-900"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Why Likelee Section */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-12">
            Why Likelee
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={index}
                  className="p-8 border-2 border-gray-200 hover:border-[#32C8D1] transition-all"
                >
                  <div className="w-14 h-14 bg-[#32C8D1] rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {benefit.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-12">
            Use Cases
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="p-8 border-2 border-gray-900 bg-white"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {useCase.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Likelee Works Section */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-12">
            How Likelee Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-[#32C8D1] rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">{index + 1}</span>
                </div>
                <p className="text-gray-900 font-medium leading-relaxed">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Our Pilot Program CTA */}
      <section className="px-6 py-16 bg-gradient-to-r from-[#32C8D1] to-[#2AB8C1]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Join Our Pilot Program
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("OrganizationSignup") + "?type=brand_company",
                )
              }
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium bg-white text-[#32C8D1] hover:bg-gray-100 shadow-xl"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              variant="outline"
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium border-2 border-white text-white hover:bg-white/10"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t("faq")}
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqVerifiedCreatorVsAiFilmmakerTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqVerifiedCreatorVsAiFilmmakerDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-2"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqMultipleCampaignsTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqMultipleCampaignsDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-3"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqRevisionsTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqRevisionsDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-4"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqApprovalTimeTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqApprovalTimeDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-5"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqGuaranteedDeliverablesTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqGuaranteedDeliverablesDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-6"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqFormatsTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqFormatsDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-7"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqExceedLicensedTimeframeTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqExceedLicensedTimeframeDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-8"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqVerifiedConsentTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqVerifiedConsentDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-9"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqUnauthorizedUseTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqUnauthorizedUseDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-10"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqNegotiatePricingTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqNegotiatePricingDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-11"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqWorkWithOwnAgencyTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqWorkWithOwnAgencyDescription")}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-12"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faqAgenciesOnLikeleeTitle")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faqAgenciesOnLikeleeDescription")}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
