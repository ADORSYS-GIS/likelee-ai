import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import {
  Shield,
  FileCheck,
  Eye,
  DollarSign,
  Lock,
  Users,
  CheckCircle2,
} from "lucide-react";

export default function AboutUs() {
  const { t } = useTranslation();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Likelee",
      description:
        "Building infrastructure for agencies that scales with technology",
      url: "https://likelee.ai/about-us",
      mainEntity: {
        "@type": "Organization",
        name: "Likelee",
        description:
          "Infrastructure for talent agencies to manage traditional bookings and AI licensing in one place",
        foundingDate: "2024",
        mission:
          "Creating a new revenue model where booking gaps become earning opportunities, operations run on automation, and agencies scale without adding headcount",
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
    <div className="bg-gray-50 min-h-screen">
      {/* Mission Section */}
      <section className="px-6 pt-12 pb-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {t("aboutUsPage.mission.title")}
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p className="text-xl font-semibold text-gray-900">
              {t("aboutUsPage.mission.subtitle")}
            </p>
            <p>{t("aboutUsPage.mission.description")}</p>
          </div>
        </div>
      </section>

      {/* Guiding Principles Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            {t("aboutUsPage.principles.title")}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((num) => (
              <Card key={num} className="p-6 border-2 border-gray-900">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">{num}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t(`aboutUsPage.principles.principle${num}.title`)}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {t(`aboutUsPage.principles.principle${num}.description`)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* The Challenge Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {t("aboutUsPage.challenge.title")}
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>{t("aboutUsPage.challenge.paragraph1")}</p>
            <p>{t("aboutUsPage.challenge.paragraph2")}</p>
            <p>{t("aboutUsPage.challenge.paragraph3")}</p>
            <p className="text-xl font-bold text-gray-900">
              {t("aboutUsPage.challenge.conclusion")}
            </p>
          </div>
        </div>
      </section>

      {/* Why Now Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {t("aboutUsPage.whyNow.title")}
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>{t("aboutUsPage.whyNow.paragraph1")}</p>
            <p>{t("aboutUsPage.whyNow.paragraph2")}</p>
            <p>{t("aboutUsPage.whyNow.paragraph3")}</p>
            <p className="text-xl font-bold text-gray-900">
              {t("aboutUsPage.whyNow.conclusion")}
            </p>
          </div>
        </div>
      </section>

      {/* Our Approach Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            {t("aboutUsPage.approach.title")}
          </h2>

          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <Card
                key={num}
                className="p-6 bg-white border-2 border-gray-200 hover:border-gray-900 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{num}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t(`aboutUsPage.approach.step${num}.title`)}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {t(`aboutUsPage.approach.step${num}.description`)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who Uses Likelee Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            {t("aboutUsPage.users.title")}
          </h2>

          <div className="space-y-6">
            {[
              "modelingAgencies",
              "sportsAgencies",
              "talentManagement",
              "allSizes",
            ].map((key) => (
              <Card key={key} className="p-6 border-2 border-gray-900">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {t(`aboutUsPage.users.${key}.title`)}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {t(`aboutUsPage.users.${key}.description`)}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Operate Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            {t("aboutUsPage.operations.title")}
          </h2>

          <div className="space-y-6">
            {[
              { key: "verification", icon: Shield },
              { key: "contracts", icon: FileCheck },
              { key: "ledger", icon: Eye },
              { key: "security", icon: Lock },
              { key: "userBuilt", icon: Users },
            ].map(({ key, icon: Icon }) => (
              <Card key={key} className="p-6 bg-white border-2 border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t(`aboutUsPage.operations.${key}.title`)}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {t(`aboutUsPage.operations.${key}.description`)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
