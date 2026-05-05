import React from "react";
import { useTranslation } from "react-i18next";

export function CreatorTermsContent() {
  const { t } = useTranslation("creatorTerms");
  const title = t("creatorTerms.title");
  const bodyHtml = t("creatorTerms.bodyHtml");

  return (
    <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
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
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <div
        className="localized-terms space-y-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </div>
  );
}
