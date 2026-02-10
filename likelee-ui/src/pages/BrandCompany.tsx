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
      description:
        "License talent likenesses for AI content. Legally. Instantly.",
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
      description:
        "AI-generated ad creative with licensed talent for campaigns, regions, duration",
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
      <section className="relative px-6 pt-24 pb-16 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6">
            License Talent Likenesses for AI Content.
          </h1>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
            <span className="text-[#26B7B9]">Legally. Instantly.</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-12">
            Brand-safe AI creative with verified talent consent in &lt;48 hours.
            Work with independent talent or their agencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("OrganizationSignup") + "?type=brand_company",
                )
              }
              className="h-14 px-12 font-bold bg-[#26B7B9] hover:bg-[#1e9596] text-white transition-all rounded-none text-lg border-2 border-[#26B7B9]"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-14 px-12 font-bold bg-white text-gray-900 hover:bg-gray-50 border-2 border-gray-900 rounded-none text-lg"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Why Likelee Section */}
      <section className="px-6 py-20 bg-[#f0f9fa]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-16">
            Why Likelee
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={index}
                  className="p-10 border-2 border-gray-900 bg-white rounded-none shadow-none"
                >
                  <div className="w-16 h-16 bg-[#26B7B9] flex items-center justify-center mb-8 rounded-none">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {benefit.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-16">
            Use Cases
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="p-10 border-2 border-gray-900 bg-[#effafb] rounded-none shadow-none"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {useCase.title}
                </h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {useCase.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Likelee Works Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-16 px-4">
            How Likelee Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-[#26B7B9] border border-gray-900 flex items-center justify-center mx-auto mb-6 rounded-none transition-all">
                  <span className="text-white font-bold text-2xl">
                    {index + 1}
                  </span>
                </div>
                <p className="text-gray-900 text-base md:text-lg leading-snug px-2 max-w-[200px] mx-auto">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Our Pilot Program CTA */}
      <section className="px-6 py-24 bg-gradient-to-r from-[#2BB7B9] via-[#1495a0] to-[#2BB7B9]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-12 tracking-tight">
            Join Our Pilot Program
          </h2>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <Button
              onClick={() =>
                navigate(
                  createPageUrl("OrganizationSignup") + "?type=brand_company",
                )
              }
              className="h-16 px-14 font-bold bg-white text-[#26B7B9] hover:bg-gray-100 rounded-none text-xl border-none"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              className="h-16 px-14 font-bold border-2 border-white text-white hover:bg-white/10 rounded-none text-xl bg-transparent"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
