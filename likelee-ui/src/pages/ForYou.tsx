import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  Shield,
  DollarSign,
  Users,
  CheckCircle,
  Eye,
  Lock,
} from "lucide-react";

export default function ForYou() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50">
      {/* Hero Section */}
      <section className="px-6 pt-24 pb-16 border-b-2 border-black">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8">
            {t("forYou.hero.title")}
            <span className="block bg-gradient-to-r from-[#32C8D1] to-teal-600 bg-clip-text text-transparent">
              {t("forYou.hero.highlight")}
            </span>
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Section 1 */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              {t("forYou.intro.p1")}
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              <span className="font-bold">{t("forYou.intro.whyBold")}</span>{" "}
              {t("forYou.intro.whyText")}
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              {t("forYou.intro.reality")}
            </p>
            <p className="text-2xl text-gray-900 font-bold mb-6">
              {t("forYou.intro.punchline")}
            </p>
            <div className="space-y-4">
              <p className="text-xl text-[#32C8D1] font-semibold">
                {t("forYou.intro.bullets.1")}
              </p>
              <p className="text-xl text-[#32C8D1] font-semibold">
                {t("forYou.intro.bullets.2")}
              </p>
              <p className="text-xl text-[#32C8D1] font-semibold">
                {t("forYou.intro.bullets.3")}
              </p>
            </div>
            <p className="text-xl text-gray-700 leading-relaxed mt-6">
              {t("forYou.intro.closing")}
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-gradient-to-br from-[#32C8D1]/10 to-teal-50 p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {t("forYou.algorithms.title")}
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              {t("forYou.algorithms.oldSystem")}
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#32C8D1] rounded-full mt-3 flex-shrink-0" />
                <p className="text-lg text-gray-700">
                  {t("forYou.algorithms.list.1")}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#32C8D1] rounded-full mt-3 flex-shrink-0" />
                <p className="text-lg text-gray-700">
                  {t("forYou.algorithms.list.2")}
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#32C8D1] rounded-full mt-3 flex-shrink-0" />
                <p className="text-lg text-gray-700">
                  {t("forYou.algorithms.list.3")}
                </p>
              </li>
            </ul>
            <p className="text-2xl text-gray-900 font-bold mb-6">
              {t("forYou.algorithms.fading")}
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              {t("forYou.algorithms.newEconomy")}
            </p>
            <p className="text-xl text-gray-700 leading-relaxed">
              {t("forYou.algorithms.closing")}
            </p>
          </div>

          {/* What Likelee Offers */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">
              {t("forYou.offer.title")}
            </h2>
            <div className="grid gap-8">
              <div className="flex gap-6">
                <div className="w-12 h-12 bg-[#32C8D1] border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t("forYou.offer.items.match.title")}
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {t("forYou.offer.items.match.description")}
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-green-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t("forYou.offer.items.earn.title")}
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {t("forYou.offer.items.earn.description")}
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-teal-500 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t("forYou.offer.items.reach.title")}
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {t("forYou.offer.items.reach.description")}
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-12 h-12 bg-cyan-600 border-2 border-black flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {t("forYou.offer.items.control.title")}
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {t("forYou.offer.items.control.description")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-gray-900 text-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <div className="flex items-center gap-4 mb-8">
              <Shield className="w-12 h-12 text-[#32C8D1]" />
              <h2 className="text-3xl md:text-4xl font-bold">
                {t("forYou.security.title")}
              </h2>
            </div>
            <p className="text-xl leading-relaxed mb-8">
              {t("forYou.security.p1")}
            </p>
            <p className="text-2xl font-bold text-[#32C8D1] mb-8">
              {t("forYou.security.p2")}
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <Lock className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {t("forYou.security.features.consent.title")}
                  </h3>
                  <p className="text-lg leading-relaxed text-gray-300">
                    {t("forYou.security.features.consent.description")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Eye className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {t("forYou.security.features.monitoring.title")}
                  </h3>
                  <p className="text-lg leading-relaxed text-gray-300">
                    {t("forYou.security.features.monitoring.description")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Shield className="w-6 h-6 text-[#32C8D1] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {t("forYou.security.features.protection.title")}
                  </h3>
                  <p className="text-lg leading-relaxed text-gray-300">
                    {t("forYou.security.features.protection.description")}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xl font-semibold mt-8 text-[#32C8D1]">
              {t("forYou.security.closing")}
            </p>
          </div>

          {/* Next Phase Section */}
          <div className="bg-white p-8 md:p-12 border-2 border-black shadow-lg rounded-none">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {t("forYou.nextPhase.title")}
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              {t("forYou.nextPhase.p1")}
            </p>
            <p className="text-xl text-gray-700 leading-relaxed mb-6">
              {t("forYou.nextPhase.p2")}
            </p>
            <div className="space-y-4 my-8">
              <p className="text-xl text-[#32C8D1] font-bold">
                {t("forYou.nextPhase.bullets.1")}
              </p>
              <p className="text-xl text-[#32C8D1] font-bold">
                {t("forYou.nextPhase.bullets.2")}
              </p>
              <p className="text-xl text-[#32C8D1] font-bold">
                {t("forYou.nextPhase.bullets.3")}
              </p>
            </div>
            <p className="text-2xl text-gray-900 font-bold">
              {t("forYou.nextPhase.closing")}
            </p>
          </div>

          {/* Final CTA Section */}
          <div className="bg-gradient-to-br from-[#32C8D1]/10 to-teal-50 p-8 md:p-12 border-2 border-black shadow-lg rounded-none text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {t("forYou.ready.title")}
            </h2>
            <p className="text-xl text-gray-700 mb-4">{t("forYou.ready.p1")}</p>
            <p className="text-xl text-gray-700 mb-8">{t("forYou.ready.p2")}</p>
            <p className="text-lg text-gray-600 mb-8">{t("forYou.ready.p3")}</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-gradient-to-br from-[#32C8D1] to-teal-600 border-t-2 border-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t("forYou.cta.title")}
          </h2>
          <p className="text-xl text-cyan-100 mb-10">
            {t("forYou.cta.description")}
          </p>
          <Button
            onClick={() => navigate(createPageUrl("ReserveProfile"))}
            className="h-16 px-12 text-lg font-medium bg-white hover:bg-gray-100 text-[#32C8D1] border-2 border-black shadow-2xl transition-all hover:scale-105 rounded-none"
          >
            {t("forYou.cta.button")}
          </Button>
        </div>
      </section>
    </div>
  );
}
