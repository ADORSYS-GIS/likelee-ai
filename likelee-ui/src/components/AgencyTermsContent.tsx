import React from "react";
import { useTranslation } from "react-i18next";

export function AgencyTermsContent() {
  const { t } = useTranslation("brandAgencyTerms");
  const title = t("brandAgencyTerms.title");
  const bodyHtml = t("brandAgencyTerms.bodyHtml");

  return (
    <div className="space-y-4 text-base text-gray-700 font-medium pb-8">
      <style>{`
        .legal-caps {
          font-size: 14px;
          line-height: 1.8;
          letter-spacing: 0.03em;
          font-weight: 400;
          color: #2a2a2a;
          background-color: #f9f9f9;
          border-left: 3px solid #4f46e5;
          padding: 16px 20px;
          border-radius: 4px;
          margin: 16px 0;
        }
      `}</style>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div
        className="localized-terms space-y-4 [&_h3]:font-bold [&_h3]:text-gray-900 [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:text-gray-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:text-gray-700"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </div>
  );
}
