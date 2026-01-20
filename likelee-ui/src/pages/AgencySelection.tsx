import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AgencySelection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    {
      title: t("talentModelingAgency"),
      desc: t("talentModelingAgencyMessage"),
      icon: Users,
      to: createPageUrl("TalentAgency"),
    },
    {
      title: t("sportsAgency"),
      desc: t("sportsAgencyMessage"),
      icon: Trophy,
      to: createPageUrl("SportsAgency"),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 pt-20 pb-10">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            {t("whatTypeOfAgencyAreYou")}
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            {t("whatTypeOfAgencyAreYouMessage")}
          </p>
        </div>
      </section>
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2 justify-center">
          {items.map(({ title, desc, icon: Icon, to }) => (
            <Card
              key={title}
              className="p-8 border-2 border-black rounded-none bg-white"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 bg-gray-900 text-white flex items-center justify-center">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <p className="text-gray-600 text-sm md:text-base">{desc}</p>
                <Button
                  onClick={() => navigate(to)}
                  className="mt-4 bg-[#32C8D1] hover:bg-[#2AB8C1] text-white border-2 border-black rounded-none w-full font-bold h-12"
                >
                  {t("organizationSignup.selectAndContinue")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
