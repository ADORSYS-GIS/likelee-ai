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
  const { t } = useTranslation();
  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About Likelee",
      description:
        "In the age of AI, human identity should be an asset, not a liability. Likelee builds the infrastructure for creators to own, control, and profit from their digital likeness.",
      url: "https://likelee.ai/about-us",
      mainEntity: {
        "@type": "Organization",
        name: "Likelee",
        description:
          "Infrastructure for creators, athletes, and talent to own, control, and profit from their digital likeness",
        foundingDate: "2024",
        mission:
          "Creating a new economy where consent is law, every use is tracked, and creators earn forever—not just once",
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

  const principles = [
    {
      number: "1",
      title: t("consentIsEverything"),
      description: t("consentIsEverythingMessage"),
    },
    {
      number: "2",
      title: t("compensationIsAutomatic"),
      description: t("compensationIsAutomaticMessage"),
    },
    {
      number: "3",
      title: t("transparencyOverSecrecy"),
      description: t("transparencyOverSecrecyMessage"),
    },
    {
      number: "4",
      title: t("humanFirstTechnologySecond"),
      description: t("humanFirstTechnologySecondMessage"),
    },
  ];

  const approachSteps = [
    {
      step: "Step 1",
      title: t("identityVerification"),
      description: t("identityVerificationMessage"),
    },
    {
      step: "Step 2",
      title: t("avatarCreation"),
      description: t("avatarCreationMessage"),
    },
    {
      step: "Step 3",
      title: t("youSetTheRules"),
      description: t("youSetTheRulesMessage"),
    },
    {
      step: "Step 4",
      title: t("brandsRequestYouApprove"),
      description: t("brandsRequestYouApproveMessage"),
    },
    {
      step: "Step 5",
      title: t("youEarnAutomatically"),
      description: t("youEarnAutomaticallyMessage"),
    },
    {
      step: "Step 6",
      title: t("youStayInControl"),
      description: t("youStayInControlMessage"),
    },
  ];

  const users = [
    {
      profile: t("creatorsAndAthletesProfile"),
      description: t("creatorsAndAthletesProfileMessage"),
    },
    {
      profile: t("talentAgenciesAndUnionsProfile"),
      description: t("talentAgenciesAndUnionsProfileMessage"),
    },
    {
      profile: t("studiosAndBrandsProfile"),
      description: t("studiosAndBrandsProfileMessage"),
    },
  ];

  const operations = [
    {
      icon: Shield,
      title: t("verificationFirst"),
      description: t("verificationFirstMessage"),
    },
    {
      icon: FileCheck,
      title: t("contractsYouActuallyUnderstand"),
      description: t("contractsYouActuallyUnderstandMessage"),
    },
    {
      icon: Eye,
      title: t("sharedLedgerFullTransparency"),
      description: t("sharedLedgerFullTransparencyMessage"),
    },
    {
      icon: Lock,
      title: t("securityByDesign"),
      description: t("securityByDesignMessage"),
    },
    {
      icon: Users,
      title: t("builtWithUsersNotForUsers"),
      description: t("builtWithUsersNotForUsersMessage"),
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Mission Section */}
      <section className="px-6 pt-12 pb-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {t("mission")}
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p className="text-xl font-semibold text-gray-900">
              {t("missionSubtitle")}
            </p>
            <p>{t("missionMessage")}</p>
          </div>
        </div>
      </section>

      {/* Guiding Principles Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            {t("guidingPrinciples")}
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
            {t("theProblemIsReal")}
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>{t("theProblemIsRealMessage1")}</p>
            <p>{t("theProblemIsRealMessage2")}</p>
            <p>{t("theProblemIsRealMessage3")}</p>
            <p className="text-xl font-bold text-gray-900">
              {t("likeleeSolvesAllThree")}
            </p>
          </div>
        </div>
      </section>

      {/* Why Now Section */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {t("whyLikeleeWhyNow")}
          </h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>{t("whyLikeleeWhyNowMessage1")}</p>
            <p>{t("whyLikeleeWhyNowMessage2")}</p>
            <p>{t("whyLikeleeWhyNowMessage3")}</p>
            <p className="text-xl font-bold text-gray-900">
              {t("whyLikeleeWhyNowMessage4")}
            </p>
          </div>
        </div>
      </section>

      {/* Our Approach Section */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            {t("howItWorks")}
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
            {t("whoUsesLikelee")}
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
            {t("howWeOperate")}
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
