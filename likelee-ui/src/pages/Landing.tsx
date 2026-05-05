import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Likelee",
      url: "https://likelee.ai",
      description: t(
        "landing.hero.description",
        "Join a growing network where real people, AI creative talent, and businesses turn creative vision into earnings—one AI-powered project at a time.",
      ),
      potentialAction: {
        "@type": "SearchAction",
        target: "https://likelee.ai/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        name: "Likelee",
        logo: {
          "@type": "ImageObject",
          url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png",
        },
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

  return (
    <div className="bg-white">
      <section className="bg-[#32C8D1] text-white">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-black tracking-tight leading-snug">
            {t(
              "landing.hero.tagline",
              "Stop Leaving Money on the Table Between Bookings",
            )}
          </h2>
        </div>
      </section>

      {/* Hero — text left, phone right, side-by-side even on mobile */}
      <section className="pt-10 sm:pt-20 pb-10 sm:pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-10 items-center">
          <div className="flex flex-col justify-center">
            <h1 className="text-xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {t(
                "landing.hero.title",
                "#1 AI-Native Talent\nManagement Platform",
              )}
            </h1>
            <p className="mt-3 sm:mt-6 text-gray-600 text-xs sm:text-base md:text-lg max-w-lg">
              {t(
                "landing.hero.subtitle",
                "Built for agencies managing both traditional bookings and AI licensing revenue.",
              )}
            </p>

            <div className="mt-4 sm:mt-8 flex flex-wrap gap-2 sm:gap-4">
              <Button
                onClick={() => navigate("/BrandCompany")}
                className="h-8 sm:h-12 px-3 sm:px-10 text-xs sm:text-base bg-[#F7B750] hover:bg-[#F7B750]/90 text-white border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              >
                {t("landing.hero.forBrandsButton", "For Brands")}
              </Button>
              <Button
                onClick={() => navigate("/AgencySelection")}
                variant="outline"
                className="h-8 sm:h-12 px-3 sm:px-10 text-xs sm:text-base bg-white hover:bg-gray-50 text-gray-900 border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              >
                {t("forAgencies", "For Agencies")}
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[120px] sm:w-[270px] md:w-[310px] lg:w-[350px] aspect-[9/18.8] rounded-[1.5rem] sm:rounded-[2.7rem] border-[5px] sm:border-[8px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden bg-black">
              <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-10 sm:w-24 h-3 sm:h-6 bg-black rounded-full z-20" />
              <video
                className="w-full h-full object-cover"
                src="/media/rea1.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — phone left, text right */}
      <section className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-12 items-center">
          <div className="flex justify-center lg:justify-start">
            <div className="relative w-[120px] sm:w-[270px] md:w-[310px] lg:w-[350px] aspect-[9/18.8] rounded-[1.5rem] sm:rounded-[2.7rem] border-[5px] sm:border-[8px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden bg-black">
              <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-10 sm:w-24 h-3 sm:h-6 bg-black rounded-full z-20" />
              <video
                className="w-full h-full object-cover"
                src="/media/real2.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>

          <div className="flex flex-col justify-center max-w-xl">
            <h2 className="text-xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {t(
                "landing.section2.title",
                "Scale Your Roster\nWithout Scaling\nHeadcount",
              )}
            </h2>
            <p className="mt-3 sm:mt-6 text-xs sm:text-lg text-gray-600">
              {t(
                "landing.section2.subtitle",
                "Same talent. Simultaneous AI campaigns. Exponential revenue growth.",
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 3 feature cards — 2 cols on mobile, 3 on desktop */}
      <section className="pb-12 sm:pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-8">
            <div className="border-2 border-black p-4 sm:p-8 sm:min-h-[180px]">
              <h3 className="text-xs sm:text-xl font-extrabold text-gray-900 leading-snug">
                {t(
                  "landing.features.card1.title",
                  "Turn Booking Gaps Into\nPredictable Monthly\nIncome",
                )}
              </h3>
              <p className="mt-2 sm:mt-5 text-gray-600 text-xs sm:text-base leading-relaxed">
                {t(
                  "landing.features.card1.description",
                  "Traditional shoots plus AI licensing. Your talent earns while waiting for their next gig.",
                )}
              </p>
            </div>
            <div className="border-2 border-black p-4 sm:p-8 sm:min-h-[180px]">
              <h3 className="text-xs sm:text-xl font-extrabold text-gray-900 leading-snug">
                {t(
                  "landing.features.card2.title",
                  "AI-Powered Operations\nwith Agency-Grade Control",
                )}
              </h3>
              <p className="mt-2 sm:mt-5 text-gray-600 text-xs sm:text-base leading-relaxed">
                {t(
                  "landing.features.card2.description",
                  "Skip manual scheduling and access intelligent booking automation. All with complete contractual oversight.",
                )}
              </p>
            </div>
            {/* Third card spans full width on mobile (2-col grid), normal on md+ */}
            <div className="col-span-2 md:col-span-1 border-2 border-black p-4 sm:p-8 sm:min-h-[180px]">
              <h3 className="text-xs sm:text-xl font-extrabold text-gray-900 leading-snug">
                {t(
                  "landing.features.card3.title",
                  "Built for Agencies of All\nSizes",
                )}
              </h3>
              <p className="mt-2 sm:mt-5 text-gray-600 text-xs sm:text-base leading-relaxed">
                {t(
                  "landing.features.card3.description",
                  "From boutique talent shops to enterprise rosters—manage traditional bookings and AI licensing in one platform built for every scale.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — text left, phone right */}
      <section className="py-10 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-12 items-center">
          <div className="flex flex-col justify-center max-w-xl">
            <h2 className="text-xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {t(
                "landing.section4.title",
                "Don't Waste Your Roster\nBetween Bookings",
              )}
            </h2>
            <p className="mt-3 sm:mt-6 text-xs sm:text-lg text-gray-600">
              {t(
                "landing.section4.subtitle",
                "AI licensing keeps talent earning consistently, and agencies feel the compounding revenue instantly.",
              )}
            </p>
            <div className="mt-4 sm:mt-8">
              <Button
                onClick={() => navigate("/Login")}
                className="h-8 sm:h-12 px-4 sm:px-10 text-xs sm:text-base bg-[#F7B750] hover:bg-[#F7B750]/90 text-white border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
              >
                {t("landing.section4.ctaButton", "Get Started")}
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[120px] sm:w-[270px] md:w-[310px] lg:w-[350px] aspect-[9/18.8] rounded-[1.5rem] sm:rounded-[2.7rem] border-[5px] sm:border-[8px] border-black shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden bg-black">
              <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-10 sm:w-24 h-3 sm:h-6 bg-black rounded-full z-20" />
              <video
                className="w-full h-full object-cover"
                src="/media/real3.mp4"
                autoPlay
                muted
                playsInline
                loop
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
