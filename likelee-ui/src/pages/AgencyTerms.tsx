import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

export default function AgencyTerms() {
  const { i18n } = useTranslation();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadTerms = async () => {
      setLoading(true);
      setError(false);

      const lang = i18n.language || "en";
      const fileName = `/terms-and-conditions-agency-${lang}.html`;

      try {
        const response = await fetch(fileName);
        if (!response.ok) {
          throw new Error("Failed to load terms");
        }
        const html = await response.text();
        setHtmlContent(html);
      } catch (err) {
        console.error("Error loading terms:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadTerms();
  }, [i18n.language]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#32C8D1] mx-auto mb-4" />
          <p className="text-gray-600">Loading terms and conditions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Failed to load terms and conditions.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-[#32C8D1] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="max-w-4xl mx-auto px-6 py-12"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
