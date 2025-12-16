import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  Shield,
  BarChart3,
  Upload,
  Settings,
  AlertCircle,
} from "lucide-react";

export default function Creators() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const messages = [
    { line1: t("faces.hero.flipper.0.line1"), line2: t("faces.hero.flipper.0.line2") },
    { line1: t("faces.hero.flipper.1.line1"), line2: t("faces.hero.flipper.1.line2") },
    { line1: t("faces.hero.flipper.2.line1"), line2: t("faces.hero.flipper.2.line2") },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsFlipping(false);
      }, 300);
    }, 3000);

    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: t("faces.meta.title"),
      description: t("faces.meta.description"),
      url: "https://likelee.ai/faces",
      mainEntity: {
        "@type": "Service",
        name: "Creator Likeness Licensing",
        provider: {
          "@type": "Organization",
          name: "Likelee",
        },
        serviceType: t("faces.meta.serviceType"),
        areaServed: "Worldwide",
        audience: {
          "@type": "Audience",
          audienceType: t("faces.meta.audienceType"),
        },
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      clearInterval(interval);
      document.head.removeChild(script);
    };
  }, [messages.length]);

  return (
    <div className="bg-white">
      <style>{`
        @keyframes flipOut {
          0% {
            transform: perspective(400px) rotateX(0deg);
            opacity: 1;
          }
          100% {
            transform: perspective(400px) rotateX(90deg);
            opacity: 0;
          }
        }
        
        @keyframes flipIn {
          0% {
            transform: perspective(400px) rotateX(-90deg);
            opacity: 0;
          }
          100% {
            transform: perspective(400px) rotateX(0deg);
            opacity: 1;
          }
        }
        
        .flip-out {
          animation: flipOut 0.3s ease-in forwards;
        }
        
        .flip-in {
          animation: flipIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto">
          <Alert className="mb-8 bg-gray-50 border-2 border-black rounded-none max-w-4xl mx-auto">
            <AlertCircle className="h-5 w-5 text-[#32C8D1]" />
            <AlertDescription className="text-gray-900 font-medium">
              {t("faces.hero.alert")}
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6">
              <span
                className={`block bg-gradient-to-r from-[#32C8D1] via-teal-500 to-cyan-600 bg-clip-text text-transparent ${isFlipping ? "flip-out" : "flip-in"}`}
                style={{ minHeight: "2.4em" }}
              >
                <span className="block">
                  {messages[currentMessageIndex].line1}
                </span>
                <span className="block">
                  {messages[currentMessageIndex].line2}
                </span>
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              {t("faces.hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate(createPageUrl("CreatorSignupOptions"))}
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black shadow-lg transition-all hover:shadow-xl hover:scale-105 rounded-none"
              >
                {t("faces.hero.signUpButton")}
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("ForYou"))}
                variant="outline"
                className="h-14 sm:h-16 px-8 sm:px-12 text-base sm:text-lg font-medium border-2 border-black rounded-none hover:bg-gray-50"
              >
                {t("faces.hero.forYouButton")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t("faces.whyChoose.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              {t("faces.whyChoose.subtitle1")}
            </p>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
              {t("faces.whyChoose.subtitle2")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.whyChoose.cards.0.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t("faces.whyChoose.cards.0.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.whyChoose.cards.1.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t("faces.whyChoose.cards.1.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.whyChoose.cards.2.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t("faces.whyChoose.cards.2.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black transition-all hover:shadow-xl group rounded-none">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.whyChoose.cards.3.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t("faces.whyChoose.cards.3.description")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Creator Section */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t("faces.featuredCreator.title")}
            </h2>
          </div>

          <Card className="p-4 md:p-8 bg-white border-2 border-black shadow-xl rounded-none">
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-1">
                <div className="mb-6">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/3ce34e58b_Screenshot2025-10-24at101047AM.png"
                    alt="Lily"
                    loading="lazy"
                    className="w-full aspect-square object-cover shadow-lg mb-4 border-2 border-black"
                  />
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                    Lily
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-900 font-medium text-sm cursor-default">
                      Instagram
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-900 font-medium text-sm cursor-default">
                      TikTok
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm md:text-base">
                    Scottsdale, Arizona
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <Card className="p-4 md:p-6 bg-gray-50 border-2 border-black rounded-none">
                    <DollarSign className="w-8 md:w-10 h-8 md:h-10 text-[#32C8D1] mb-3" />
                    <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">
                      {t("faces.featuredCreator.royaltiesEarned")}
                    </p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900">
                      $10,238
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 mt-2">
                      {t("faces.featuredCreator.royaltiesDescription")}
                    </p>
                  </Card>

                  <Card className="p-4 md:p-6 bg-gray-50 border-2 border-black rounded-none">
                    <BarChart3 className="w-8 md:w-10 h-8 md:h-10 text-teal-500 mb-3" />
                    <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">
                      {t("faces.featuredCreator.usageRequests")}
                    </p>
                    <p className="text-2xl md:text-4xl font-bold text-gray-900">
                      7
                    </p>
                  </Card>
                </div>

                <div className="bg-gray-50 p-4 md:p-6 border-2 border-black rounded-none">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6">
                    {t("faces.featuredCreator.controlSettings")}
                  </h3>
                  <div className="space-y-4 md:space-y-5">
                    <div className="flex items-center justify-between p-3 md:p-4 bg-white border-2 border-black rounded-none">
                      <span className="text-sm md:text-base text-gray-900 font-medium">
                        {t("faces.featuredCreator.allowCommercialUse")}
                      </span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 md:p-4 bg-white border-2 border-black rounded-none">
                      <span className="text-sm md:text-base text-gray-900 font-medium">
                        {t("faces.featuredCreator.allowFilmUse")}
                      </span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 font-medium border-2 border-black rounded-none text-sm md:text-base"
                  >
                    {t("faces.featuredCreator.viewUsageReportButton")}
                  </Button>
                  <Button className="flex-1 h-12 font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none text-sm md:text-base">
                    {t("faces.featuredCreator.updateSettingsButton")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t("faces.howItWorks.title")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("faces.howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">1</span>
              </div>
              <div className="mb-6">
                <Upload className="w-14 h-14 text-[#32C8D1] mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.howItWorks.steps.0.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                {t("faces.howItWorks.steps.0.description")}
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-600 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">2</span>
              </div>
              <div className="mb-6">
                <Settings className="w-14 h-14 text-teal-500 mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.howItWorks.steps.1.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                {t("faces.howItWorks.steps.1.description")}
              </p>
            </div>

            <div className="text-center border-2 border-black p-8 bg-white">
              <div className="w-24 h-24 bg-gradient-to-br from-[#32C8D1] to-teal-500 border-2 border-black flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-5xl font-bold text-white">3</span>
              </div>
              <div className="mb-6">
                <DollarSign className="w-14 h-14 text-[#32C8D1] mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.howItWorks.steps.2.title")}
              </h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                {t("faces.howItWorks.steps.2.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* From Creator → Digital Talent Owner */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("faces.digitalTalentOwner.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t("faces.digitalTalentOwner.subtitle")}
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none mb-12">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-center">
              {t("faces.digitalTalentOwner.mainContent")}
            </p>
          </Card>

          <div className="mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              {t("faces.digitalTalentOwner.comparison.title")}
            </h3>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.traditionalPath")}
                  </h4>
                  <p className="text-gray-700">{t("faces.digitalTalentOwner.comparison.traditionalPathDescription1")}</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.likeleeModel")}
                  </h4>
                  <p className="text-gray-700">{t("faces.digitalTalentOwner.comparison.likeleeModelDescription1")}</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.traditionalPath")}
                  </h4>
                  <p className="text-gray-700">{t("faces.digitalTalentOwner.comparison.traditionalPathDescription2")}</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.likeleeModel")}
                  </h4>
                  <p className="text-gray-700">
                    {t("faces.digitalTalentOwner.comparison.likeleeModelDescription2")}
                  </p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.traditionalPath")}
                  </h4>
                  <p className="text-gray-700">{t("faces.digitalTalentOwner.comparison.traditionalPathDescription3")}</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.likeleeModel")}
                  </h4>
                  <p className="text-gray-700">{t("faces.digitalTalentOwner.comparison.likeleeModelDescription3")}</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-50 border-2 border-black rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.traditionalPath")}
                  </h4>
                  <p className="text-gray-700">{t("faces.digitalTalentOwner.comparison.traditionalPathDescription4")}</p>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none">
                  <h4 className="font-bold text-gray-900 mb-2">
                    {t("faces.digitalTalentOwner.comparison.likeleeModel")}
                  </h4>
                  <p className="text-gray-700">{t("faces.digitalTalentOwner.comparison.likeleeModelDescription4")}</p>
                </Card>
              </div>
            </div>
          </div>

          <Card className="p-8 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-none text-center">
            <p className="text-2xl md:text-3xl font-bold text-white">
              {t("faces.digitalTalentOwner.footer")}
            </p>
          </Card>
        </div>
      </section>

      {/* Real Faces Real Futures */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("faces.realFutures.title")}
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed mb-12">
            <p>
              {t("faces.realFutures.line1")}
            </p>
            <p className="font-bold text-gray-900 text-xl">
              {t("faces.realFutures.line2")}
            </p>
            <p>
              {t("faces.realFutures.line3")}
            </p>
            <p className="font-bold text-gray-900 text-xl">
              {t("faces.realFutures.line4")}
            </p>
          </div>
        </div>
      </section>

      {/* Creator Value Floor */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("faces.valueFloor.title")}
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed mb-12">
            <p>
              {t("faces.valueFloor.line1")}
            </p>
            <p>
              {t("faces.valueFloor.line2")}
            </p>
            <p className="font-bold text-gray-900">
              {t("faces.valueFloor.line3")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none text-center">
              <p className="text-5xl font-bold text-gray-900 mb-4">$350</p>
              <p className="text-gray-700 font-medium">
                {t("faces.valueFloor.cards.0.description")}
              </p>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-[#32C8D1]/10 to-teal-500/10 border-2 border-[#32C8D1] rounded-none text-center">
              <p className="text-5xl font-bold text-gray-900 mb-4">$1,200</p>
              <p className="text-gray-700 font-medium">
                {t("faces.valueFloor.cards.1.description")}
              </p>
            </Card>

            <Card className="p-8 bg-gray-50 border-2 border-black rounded-none text-center">
              <p className="text-2xl font-bold text-gray-900 mb-4">
                {t("faces.valueFloor.cards.2.title")}
              </p>
              <p className="text-gray-700 font-medium">
                {t("faces.valueFloor.cards.2.description")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Real Creators Real Earnings */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t("faces.realEarnings.title")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("faces.realEarnings.subtitle")}
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="mb-6">
                <p className="text-4xl font-bold text-[#32C8D1] mb-2">
                  $1,500/month
                </p>
                <p className="text-xl font-semibold text-gray-900 mb-4">
                  {t("faces.realEarnings.cards.0.title")}
                </p>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>
                  {t("faces.realEarnings.cards.0.line1")}
                </p>
                <p>
                  {t("faces.realEarnings.cards.0.line2")}
                </p>
                <p>
                  {t("faces.realEarnings.cards.0.line3")}
                </p>
                <p className="pt-4 border-t-2 border-gray-200 font-bold text-gray-900">
                  {t("faces.realEarnings.cards.0.total")}
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="mb-6">
                <p className="text-4xl font-bold text-[#32C8D1] mb-2">
                  $700/month
                </p>
                <p className="text-xl font-semibold text-gray-900 mb-4">
                  {t("faces.realEarnings.cards.1.title")}
                </p>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>{t("faces.realEarnings.cards.1.line1")}</p>
                <p>{t("faces.realEarnings.cards.1.line2")}</p>
                <p>{t("faces.realEarnings.cards.1.line3")}</p>
                <p className="pt-4 border-t-2 border-gray-200 font-bold text-gray-900">
                  {t("faces.realEarnings.cards.1.total")}
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <div className="mb-6">
                <p className="text-4xl font-bold text-[#32C8D1] mb-2">
                  $3,600/year
                </p>
                <p className="text-xl font-semibold text-gray-900 mb-4">
                  {t("faces.realEarnings.cards.2.title")}
                </p>
              </div>
              <div className="space-y-3 text-gray-700">
                <p>
                  {t("faces.realEarnings.cards.2.line1")}
                </p>
                <p>
                  {t("faces.realEarnings.cards.2.line2")}
                </p>
                <p>
                  {t("faces.realEarnings.cards.2.line3")}
                </p>
                <p className="pt-4 border-t-2 border-gray-200 font-bold text-gray-900">
                  {t("faces.realEarnings.cards.2.total")}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works: Monthly Retainer Model */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("faces.retainerModel.title")}
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <span className="font-bold text-gray-900">{t("faces.retainerModel.steps.0.title")}</span> → {t("faces.retainerModel.steps.0.description")}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <span className="font-bold text-gray-900">{t("faces.retainerModel.steps.1.title")}</span> → {t("faces.retainerModel.steps.1.description")}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <span className="font-bold text-gray-900">{t("faces.retainerModel.steps.2.title")}</span> → {t("faces.retainerModel.steps.2.description")}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <span className="font-bold text-gray-900">{t("faces.retainerModel.steps.3.title")}</span> → {t("faces.retainerModel.steps.3.description")}
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-[#32C8D1] rounded-full mt-2 flex-shrink-0"></div>
              <p>
                <span className="font-bold text-gray-900">{t("faces.retainerModel.steps.4.title")}</span> → {t("faces.retainerModel.steps.4.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Monthly Retainer Advantage */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("faces.retainerAdvantage.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("faces.retainerAdvantage.cards.0.title")}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t("faces.retainerAdvantage.cards.0.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("faces.retainerAdvantage.cards.1.title")}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t("faces.retainerAdvantage.cards.1.description")}
                monthly
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("faces.retainerAdvantage.cards.2.title")}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t("faces.retainerAdvantage.cards.2.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("faces.retainerAdvantage.cards.2.title")}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t("faces.retainerAdvantage.cards.2.description")}
              </p>
            </Card>

            <Card className="p-8 bg-white border-2 border-black rounded-none md:col-span-2">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("faces.retainerAdvantage.cards.3.title")}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {t("faces.retainerAdvantage.cards.3.description")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Real Creators Real Monthly Income */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("faces.realMonthlyIncome.title")}
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed mb-8">
            {t("faces.realMonthlyIncome.subtitle1")}
          </p>
          <p className="text-xl font-bold text-gray-900">
            {t("faces.realMonthlyIncome.subtitle2")}
          </p>
        </div>
      </section>

      {/* Protect Your Digital Twin Section */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("faces.likenessStaysYours.title")}
            </h2>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              {t("faces.likenessStaysYours.line1")}
            </p>
            <p>
              {t("faces.likenessStaysYours.line2")}
            </p>
            <p className="font-semibold text-gray-900">
              {t("faces.likenessStaysYours.line3")}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t("faces.faq.title")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("faces.faq.subtitle")}
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.0.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.0.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.1.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.1.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.2.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.2.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.3.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.3.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-5"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.4.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.4.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-6"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.5.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.5.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-7"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.6.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.6.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-8"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.7.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.7.description")}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-9"
              className="border-2 border-black rounded-none bg-white"
            >
              <AccordionTrigger className="px-6 py-4 text-lg font-semibold text-gray-900 hover:no-underline">
                {t("faces.faq.questions.8.title")}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-base text-gray-700 leading-relaxed">
                {t("faces.faq.questions.8.description")}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-br from-[#32C8D1] via-teal-500 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t("faces.cta.title")}
          </h2>
          <p className="text-xl text-white mb-8">
            {t("faces.cta.subtitle")}
          </p>

          <div className="bg-white/10 backdrop-blur-sm border-2 border-white p-8 rounded-none mb-10">
            <h3 className="text-2xl font-bold text-white mb-6">
              {t("faces.cta.howToGetStarted")}
            </h3>
            <div className="space-y-3 text-lg text-white text-left max-w-2xl mx-auto">
              <p>
                {t("faces.cta.steps.0")}
              </p>
              <p>
                {t("faces.cta.steps.1")}
              </p>
              <p>
                {t("faces.cta.steps.2")}
              </p>
              <p>
                {t("faces.cta.steps.3")}
              </p>
              <p>
                {t("faces.cta.steps.4")}
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate(createPageUrl("ReserveProfile"))}
            className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-[#32C8D1] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            {t("faces.cta.reserveProfileButton")}
          </Button>
        </div>
      </section>
    </div>
  );
}
