import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/config/public";
import { Card } from "@/components/ui/card";
import CinematicGlobe from "@/components/CinematicGlobe";

export default function Impact() {
  const { t } = useTranslation();

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: t("impactPage.hero.title") + " " + t("impactPage.hero.subtitle"),
      description: t("impactPage.hero.description"),
      url: "https://likelee.ai/impact",
      about: {
        "@type": "Thing",
        name: "Environmental Sustainability",
        description: t("impactPage.hero.description"),
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
    <div>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        
        .stars-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%);
        }
        
        .stars-bg::before,
        .stars-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, white, transparent),
            radial-gradient(2px 2px at 60px 70px, white, transparent),
            radial-gradient(1px 1px at 50px 50px, white, transparent),
            radial-gradient(1px 1px at 130px 80px, white, transparent),
            radial-gradient(2px 2px at 90px 10px, white, transparent),
            radial-gradient(1px 1px at 150px 120px, white, transparent),
            radial-gradient(2px 2px at 200px 90px, white, transparent),
            radial-gradient(1px 1px at 250px 40px, white, transparent),
            radial-gradient(1px 1px at 300px 100px, white, transparent),
            radial-gradient(2px 2px at 350px 60px, white, transparent);
          background-size: 400px 400px;
          background-repeat: repeat;
          animation: twinkle 3s ease-in-out infinite;
        }
        
        .stars-bg::after {
          background-image: 
            radial-gradient(1px 1px at 100px 150px, white, transparent),
            radial-gradient(2px 2px at 180px 20px, white, transparent),
            radial-gradient(1px 1px at 220px 180px, white, transparent),
            radial-gradient(1px 1px at 280px 130px, white, transparent),
            radial-gradient(2px 2px at 320px 170px, white, transparent),
            radial-gradient(1px 1px at 40px 110px, white, transparent),
            radial-gradient(1px 1px at 140px 190px, white, transparent),
            radial-gradient(2px 2px at 270px 30px, white, transparent),
            radial-gradient(1px 1px at 330px 140px, white, transparent),
            radial-gradient(1px 1px at 370px 80px, white, transparent);
          background-size: 400px 400px;
          animation: twinkle 4s ease-in-out infinite reverse;
        }
      `}</style>

      {/* Hero Section with Globe */}
      <section className="relative px-6 pt-24 pb-16 overflow-hidden">
        <div className="stars-bg"></div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            {t("impactPage.hero.title")}
            <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t("impactPage.hero.subtitle")}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed mb-12">
            {t("impactPage.hero.description")}
          </p>
        </div>

        {/* Cinematic Globe */}
        <div className="relative z-10 max-w-5xl mx-auto mb-8">
          <CinematicGlobe />
        </div>
      </section>

      {/* Why This Matters */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            {t("impactPage.whyMatters.title")}
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed">
            {t("impactPage.whyMatters.description")}
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t("impactPage.approach.title")}
            </h2>
          </div>

          <div className="grid gap-8">
            <Card className="p-8 border-2 border-emerald-400 hover:shadow-xl transition-all rounded-none bg-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-4">
                {t("impactPage.approach.infrastructure.title")}
              </h3>
              <p className="text-gray-200 leading-relaxed text-lg">
                {t("impactPage.approach.infrastructure.description")}
              </p>
            </Card>

            <Card className="p-8 border-2 border-emerald-400 hover:shadow-xl transition-all rounded-none bg-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-4">
                {t("impactPage.approach.transparency.title")}
              </h3>
              <p className="text-gray-200 leading-relaxed text-lg">
                {t("impactPage.approach.transparency.description")}
              </p>
            </Card>

            <Card className="p-8 border-2 border-emerald-400 hover:shadow-xl transition-all rounded-none bg-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-4">
                {t("impactPage.approach.collaboration.title")}
              </h3>
              <p className="text-gray-200 leading-relaxed text-lg">
                {t("impactPage.approach.collaboration.description")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* What We Stand By */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            {t("impactPage.standBy.title")}
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed">
            {t("impactPage.standBy.description")}
          </p>
        </div>
      </section>

      {/* Your Role */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            {t("impactPage.yourRole.title")}
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed">
            {t("impactPage.yourRole.description")}
          </p>
        </div>
      </section>

      {/* Looking Forward */}
      <section
        className="relative px-6 pt-12 pb-16"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15, 35, 65, 1) 0%, rgba(5, 15, 30, 1) 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            {t("impactPage.lookingForward.title")}
          </h2>
          <p className="text-xl text-gray-200 leading-relaxed mb-8">
            {t("impactPage.lookingForward.paragraph1")}
          </p>
          <p className="text-2xl text-emerald-400 font-bold mb-6">
            {t("impactPage.lookingForward.paragraph2")}
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            {t("impactPage.lookingForward.paragraph3")}{" "}
            <a
              href={CONTACT_EMAIL_MAILTO}
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
