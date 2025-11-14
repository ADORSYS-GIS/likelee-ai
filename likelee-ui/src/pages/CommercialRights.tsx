
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Shield, Zap, FileCheck, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CommercialRights() {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Shield,
      title: "Verified Creator Consent",
      description: "Not data extraction. Creators actively license their likeness through Likelee. Every permission is explicit, time-limited, and revocable."
    },
    {
      icon: Zap,
      title: "Built for Speed & Scale",
      description: "We engineered infrastructure to deliver licensed creative in <48 hours—no back-and-forth, no legal delays. Your creative pipeline moves at brand speed, not celebrity speed."
    },
    {
      icon: FileCheck,
      title: "Smart Contract Protection",
      description: "Every license embeds usage scope, territory, duration, and compensation automatically. No gray areas. Watermarked assets + cryptographic verification ensure compliance."
    }
  ];

  const useCases = [
    {
      title: "Performance Marketing",
      description: "License creator likenesses for social media ads. Set impressions, regions, and duration upfront. Pay only for active months."
    },
    {
      title: "E-Commerce & Web",
      description: "Feature verified creators on product pages and campaigns. Full transparency on who approved what, for how long."
    },
    {
      title: "Outdoor & In-Store",
      description: "Billboard, retail, and experiential campaigns with pre-cleared talent. No last-minute legal complications."
    },
    {
      title: "Content & Gaming",
      description: "Integrate creator likenesses into films, games, and interactive experiences with verified commercial rights."
    }
  ];

  const steps = [
    "Verified creators upload profiles + set licensing terms",
    "You browse, select, submit your brief",
    "Creator approves in one click",
    "You receive watermarked asset + binding license agreement"
  ];

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Commercial Rights & Creator Licensing",
      "description": "Get brand-safe creative with verified, consented talent in under 48 hours. Smart contracts, watermarked assets, and full compliance.",
      "provider": {
        "@type": "Organization",
        "name": "Likelee",
        "url": "https://likelee.ai"
      },
      "serviceType": "Commercial Likeness Licensing",
      "areaServed": "Worldwide",
      "offers": {
        "@type": "Offer",
        "description": "License verified creator likenesses legally and instantly for commercial use"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
            License Verified Creator Likenesses.
            <span className="block bg-gradient-to-r from-[#32C8D1] via-teal-500 to-cyan-600 bg-clip-text text-transparent">
              Legally. Instantly.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 leading-relaxed max-w-4xl mx-auto mb-10">
            Get brand-safe creative with real, consented talent in &lt;48 hours. Every license is verified, tracked, and fully compliant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("OrganizationSignup"))}
              className="h-16 px-12 text-lg font-medium bg-gradient-to-r from-[#32C8D1] to-teal-600 hover:opacity-90 text-white border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              variant="outline"
              className="h-16 px-12 text-lg font-medium border-2 border-black rounded-none"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Why Likelee Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Likelee for Commercial Rights
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-600 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {benefit.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Commercial Rights by Use Case */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Commercial Rights by Use Case
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="p-8 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-black transition-all hover:shadow-xl rounded-none">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{useCase.title}</h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {useCase.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Likelee Works */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How Likelee Works
            </h2>
            <p className="text-2xl text-gray-700">
              Creators Control. Brands Get Peace of Mind.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#32C8D1] to-teal-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <span className="text-4xl font-bold text-white">{index + 1}</span>
                </div>
                <p className="text-gray-700 leading-relaxed text-lg font-medium">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-[#32C8D1] via-teal-600 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to license verified creator likenesses?
          </h2>
          <p className="text-xl text-cyan-100 mb-10">
            Get started with brand-safe, legally compliant creative in under 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate(createPageUrl("OrganizationSignup"))}
              className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-[#32C8D1] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("SalesInquiry"))}
              variant="outline"
              className="h-16 px-12 text-lg font-medium bg-transparent hover:bg-white/10 text-white border-2 border-white rounded-none"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
