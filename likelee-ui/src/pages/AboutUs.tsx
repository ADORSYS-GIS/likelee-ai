import React, { useEffect } from "react";
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
import { useTranslation } from "react-i18next";

export default function AboutUs() {
  const { t } = useTranslation("common");
  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: t("aboutUsPage.mission.title"),
      description: t("aboutUsPage.mission.subtitle"),
      url: "https://likelee.ai/about-us",
      mainEntity: {
        "@type": "Organization",
        name: "Likelee",
        description: t("aboutUsPage.mission.description"),
        foundingDate: "2024",
        mission: t("aboutUsPage.mission.description"),
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [t]);

  const principles = [
    {
      number: "1",
      title: t("aboutUsPage.principles.principle1.title"),
      description: t("aboutUsPage.principles.principle1.description"),
    },
    {
      number: "2",
      title: t("aboutUsPage.principles.principle2.title"),
      description: t("aboutUsPage.principles.principle2.description"),
    },
    {
      number: "3",
      title: t("aboutUsPage.principles.principle3.title"),
      description: t("aboutUsPage.principles.principle3.description"),
    },
    {
      number: "4",
      title: t("aboutUsPage.principles.principle4.title"),
      description: t("aboutUsPage.principles.principle4.description"),
    },
  ];

  const approachSteps = [
    {
      step: "Step 1",
      title: t("aboutUsPage.approach.step1.title"),
      description: t("aboutUsPage.approach.step1.description"),
    },
    {
      step: "Step 2",
      title: t("aboutUsPage.approach.step2.title"),
      description: t("aboutUsPage.approach.step2.description"),
    },
    {
      step: "Step 3",
      title: t("aboutUsPage.approach.step3.title"),
      description: t("aboutUsPage.approach.step3.description"),
    },
    {
      step: "Step 4",
      title: t("aboutUsPage.approach.step4.title"),
      description: t("aboutUsPage.approach.step4.description"),
    },
    {
      step: "Step 5",
      title: t("aboutUsPage.approach.step5.title"),
      description: t("aboutUsPage.approach.step5.description"),
    },
    {
      step: "Step 6",
      title: t("aboutUsPage.approach.step6.title"),
      description: t("aboutUsPage.approach.step6.description"),
    },
  ];

  const users = [
    {
      profile: t("aboutUsPage.users.modelingAgencies.title"),
      description: t("aboutUsPage.users.modelingAgencies.description"),
    },
    {
      profile: t("aboutUsPage.users.sportsAgencies.title"),
      description: t("aboutUsPage.users.sportsAgencies.description"),
    },
    {
      profile: t("aboutUsPage.users.talentManagement.title"),
      description: t("aboutUsPage.users.talentManagement.description"),
    },
    {
      profile: t("aboutUsPage.users.allSizes.title"),
      description: t("aboutUsPage.users.allSizes.description"),
    },
  ];

  const operations = [
    {
      icon: Shield,
      title: t("aboutUsPage.operations.verification.title"),
      description: t("aboutUsPage.operations.verification.description"),
    },
    {
      icon: FileCheck,
      title: t("aboutUsPage.operations.contracts.title"),
      description: t("aboutUsPage.operations.contracts.description"),
    },
    {
      icon: Eye,
      title: t("aboutUsPage.operations.ledger.title"),
      description: t("aboutUsPage.operations.ledger.description"),
    },
    {
      icon: Lock,
      title: t("aboutUsPage.operations.security.title"),
      description: t("aboutUsPage.operations.security.description"),
    },
    {
      icon: Users,
      title: t("aboutUsPage.operations.userBuilt.title"),
      description: t("aboutUsPage.operations.userBuilt.description"),
    },
  ];

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
            {principles.map((principle) => (
              <Card
                key={principle.number}
                className="p-6 border-2 border-gray-900"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">
                      {principle.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {principle.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {principle.description}
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
            {approachSteps.map((item, index) => (
              <Card
                key={index}
                className="p-6 bg-white border-2 border-gray-200 hover:border-gray-900 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {item.description}
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
            {users.map((user, index) => (
              <Card key={index} className="p-6 border-2 border-gray-900">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {user.profile}
                </h3>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {user.description}
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
            {operations.map((operation, index) => {
              const Icon = operation.icon;
              return (
                <Card
                  key={index}
                  className="p-6 bg-white border-2 border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {operation.title}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {operation.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
