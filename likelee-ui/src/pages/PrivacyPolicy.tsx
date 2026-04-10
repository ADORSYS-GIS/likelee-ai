import React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/config/public";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 md:p-12 bg-white border-2 border-black shadow-xl rounded-none">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t("privacyPolicy.title")}
          </h1>
          <p className="text-gray-600 mb-12">
            {t("privacyPolicy.lastUpdated")}
          </p>

          <div className="prose prose-lg max-w-none space-y-8">
            <p className="text-gray-700 leading-relaxed">
              {t("privacyPolicy.intro")}
            </p>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.1.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  {t("privacyPolicy.sections.1.accountData.label")}
                </strong>{" "}
                {t("privacyPolicy.sections.1.accountData.content")}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  {t("privacyPolicy.sections.1.likenessMedia.label")}
                </strong>{" "}
                {t("privacyPolicy.sections.1.likenessMedia.content")}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>{t("privacyPolicy.sections.1.usageData.label")}</strong>{" "}
                {t("privacyPolicy.sections.1.usageData.content")}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  {t("privacyPolicy.sections.1.communications.label")}
                </strong>{" "}
                {t("privacyPolicy.sections.1.communications.content")}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>
                  {t("privacyPolicy.sections.1.thirdParties.label")}
                </strong>{" "}
                {t("privacyPolicy.sections.1.thirdParties.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.2.title")}
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                {t("privacyPolicy.sections.2.list", {
                  returnObjects: true,
                }).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.3.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  {t("privacyPolicy.sections.3.consentFirst.label")}
                </strong>{" "}
                {t("privacyPolicy.sections.3.consentFirst.content")}
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>{t("privacyPolicy.sections.3.training.label")}</strong>{" "}
                {t("privacyPolicy.sections.3.training.content")}
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>{t("privacyPolicy.sections.3.takedowns.label")}</strong>{" "}
                {t("privacyPolicy.sections.3.takedowns.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.4.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.4.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.5.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t("privacyPolicy.sections.5.p1")}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                {t("privacyPolicy.sections.5.p2")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                {t("privacyPolicy.sections.5.list", {
                  returnObjects: true,
                }).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.6.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.6.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.7.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.7.content")}{" "}
                <a
                  href="mailto:security@likelee.ai"
                  className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
                >
                  security@likelee.ai
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.8.title")}
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                <li>{t("privacyPolicy.sections.8.list.0")}</li>
                <li>{t("privacyPolicy.sections.8.list.1")}</li>
                <li>{t("privacyPolicy.sections.8.list.2")}</li>
                <li>
                  <strong>{t("privacyPolicy.sections.8.list.3.label")}</strong>{" "}
                  {t("privacyPolicy.sections.8.list.3.content")}{" "}
                  <a
                    href="mailto:privacy@likelee.ai"
                    className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
                  >
                    privacy@likelee.ai
                  </a>{" "}
                  {t("privacyPolicy.sections.8.list.3.suffix")}
                </li>
                <li>{t("privacyPolicy.sections.8.list.4")}</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>{t("privacyPolicy.sections.8.requests")}</strong>{" "}
                <a
                  href={CONTACT_EMAIL_MAILTO}
                  className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.9.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.9.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.10.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.10.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.11.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.11.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.12.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.12.content")}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("privacyPolicy.sections.13.title")}
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {t("privacyPolicy.sections.13.company")}
                <br />
                <a
                  href={CONTACT_EMAIL_MAILTO}
                  className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
