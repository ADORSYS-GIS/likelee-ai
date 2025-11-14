import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { ArrowRight, Building2, Users, UserCircle, Trophy } from "lucide-react";

export default function ForBusiness() {
  const navigate = useNavigate();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "For Business - AI-Powered Creator Licensing",
      "description": "Built for brands, agencies, and talent partners who demand verified creators, transparent licensing, and AI-ready production tools.",
      "url": "https://likelee.ai/for-business",
      "mainEntity": {
        "@type": "Service",
        "name": "Business Solutions",
        "provider": {
          "@type": "Organization",
          "name": "Likelee"
        },
        "serviceType": "Creator Licensing & Management Platform",
        "audience": [
          {
            "@type": "Audience",
            "audienceType": "Brands"
          },
          {
            "@type": "Audience",
            "audienceType": "Marketing Agencies"
          },
          {
            "@type": "Audience",
            "audienceType": "Talent Agencies"
          },
          {
            "@type": "Audience",
            "audienceType": "Sports Agencies"
          }
        ]
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

  const businessTypes = [
    {
      title: "For Brands & Companies",
      description: "Launch authentic, AI-powered campaigns featuring verified human creators. License faces directly, collaborate with AI artists, and deliver content in hours—not weeks.",
      icon: Building2,
      gradient: "from-[#F7B750] to-[#FAD54C]",
      path: "BrandCompany"
    },
    {
      title: "For Marketing Agencies",
      description: "Manage client campaigns built on real, licensed creators. Access verified faces, hire AI artists, and track campaign performance in one place.",
      icon: Users,
      gradient: "from-[#32C8D1] to-teal-500",
      path: "MarketingAgency"
    },
    {
      title: "For Talent & Modeling Agencies",
      description: "Protect and monetize your roster's digital likenesses. Upload verified talent, manage consent logs, and generate passive royalties through AI-driven collaborations.",
      icon: UserCircle,
      gradient: "from-indigo-600 to-purple-600",
      path: "TalentAgency"
    },
    {
      title: "For Sports Agencies & Athlete Representatives",
      description: "AI-ready NIL management with verified rights and automated royalties. Protect athlete likenesses, track usage, and unlock new earning streams in the age of AI.",
      icon: Trophy,
      gradient: "from-emerald-600 to-teal-600",
      path: "SportsAgency"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-16 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-8">
            Likelee for Business
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Built for brands, agencies, and talent partners who demand verified creators, transparent licensing, and AI-ready production tools.
          </p>
        </div>
      </section>

      {/* Business Type Cards */}
      <section className="px-6 py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {businessTypes.map((business, index) => {
              const Icon = business.icon;
              return (
                <Card
                  key={index}
                  onClick={() => navigate(createPageUrl(business.path))}
                  className="group relative p-10 bg-white border-2 border-black rounded-none hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
                >
                  <div className="relative">
                    <div className={`w-16 h-16 bg-gradient-to-br ${business.gradient} border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {business.title}
                    </h3>
                    
                    <p className="text-lg text-gray-600 leading-relaxed mb-6">
                      {business.description}
                    </p>
                    
                    <div className="flex items-center text-gray-900 font-semibold group-hover:gap-3 gap-2 transition-all">
                      Learn More
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="px-6 py-20 bg-gray-900">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            The Infrastructure Behind the Identity Economy
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
            Likelee connects real creators, AI talent, and studios through secure likeness licensing and transparent collaboration tools. Every campaign is human-verified, consent-backed, and ready for the future of media.
          </p>
        </div>
      </section>
    </div>
  );
}