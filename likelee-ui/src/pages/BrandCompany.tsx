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
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: t("brandCampaignSolutions"),
      description: t("brandCampaignSolutionsDescription"),
      provider: {
        "@type": "Organization",
        name: "Likelee",
        url: "https://likelee.ai",
      },
      serviceType: t("brandMarketingLicensing"),
      areaServed: t("worldwide"),
      audience: {
        "@type": "Audience",
        audienceType: t("brandAudiences"),
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
            {t("dontLoseBrandTrust")}
          </h1>
          <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-6">
            {t("licenseRealTalent")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() =>
                navigate(`${createPageUrl("ComingSoon")}?feature=Brand%20signup`)
              }
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium bg-gradient-to-r from-[#F7B750] to-[#FAD54C] text-white border-2 border-black shadow-xl rounded-none"
            >
              {t("browseMarketplace")}
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              variant="outline"
              className="h-12 sm:h-14 px-8 sm:px-10 font-medium border-2 border-black rounded-none"
            >
              {t("scheduleDemo")}
            </Button>
          </div>
        </div>
      </section>
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
