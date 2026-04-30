import React from "react";
import { useTranslation } from "react-i18next";

export function AgencyTermsContent() {
  const { t } = useTranslation();
  const bodyHtml = t("brandAgencyTerms.bodyHtml", {
    defaultValue: "",
  });
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
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {t("brandAgencyTerms.title", { defaultValue: "Terms and Conditions" })}
      </h2>

      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </div>
  );
}
