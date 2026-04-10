import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Shield,
  DollarSign,
  Lock,
  FileText,
  Users,
  Scale,
} from "lucide-react";

export default function SAGAFTRAAlignment() {
  const { t } = useTranslation();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "SAG-AFTRA Alignment",
      description:
        "How Likelee implements SAG-AFTRA AI safeguards: informed consent, fair pay, scope-locked usage, and enforceable protections for all creators.",
      url: "https://likelee.ai/s-a-g-a-f-t-r-a-alignment",
      about: {
        "@type": "Thing",
        name: "SAG-AFTRA AI Guidelines Compliance",
        description:
          "Likelee bakes the 2025 SAG-AFTRA Commercials Contract AI safeguards into every license",
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

  const safeguards = [
    {
      icon: FileText,
      key: "informedConsent",
      color: "from-[#32C8D1] to-teal-600",
    },
    {
      icon: DollarSign,
      key: "fairPay",
      color: "from-green-500 to-emerald-600",
    },
    {
      icon: Lock,
      key: "scopeLocked",
      color: "from-[#F18B6A] to-[#E07A5A]",
    },
    {
      icon: Shield,
      key: "noBlanket",
      color: "from-purple-500 to-indigo-600",
    },
    {
      icon: Users,
      key: "aiTraining",
      color: "from-[#F7B750] to-yellow-600",
    },
    {
      icon: Users,
      key: "backgroundTalent",
      color: "from-cyan-500 to-blue-600",
    },
    {
      icon: Scale,
      key: "enforceable",
      color: "from-red-500 to-pink-600",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle2 className="w-16 h-16 mx-auto text-[#32C8D1] mb-4" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            {t("sagAftraPage.hero.title")}
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
            {t("sagAftraPage.hero.description")}
          </p>
        </div>
      </section>

      {/* Safeguards Grid */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {safeguards.map((safeguard) => {
              const Icon = safeguard.icon;
              return (
                <Card
                  key={safeguard.key}
                  className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none"
                >
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${safeguard.color} border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {t(`sagAftraPage.safeguards.${safeguard.key}.title`)}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {t(`sagAftraPage.safeguards.${safeguard.key}.description`)}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Line Section */}
      <section className="px-6 py-16 bg-gradient-to-r from-[#32C8D1] via-teal-500 to-cyan-600">
        <div className="max-w-5xl mx-auto">
          <Card className="p-12 bg-white border-2 border-black shadow-2xl rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
              {t("sagAftraPage.bottomLine.title")}
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed text-center">
              {t("sagAftraPage.bottomLine.description")}
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
