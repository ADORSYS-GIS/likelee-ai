import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useTranslation } from "react-i18next";

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useTranslation();

  const handleGoBack = () => {
    navigate(-1);
  };

  const restrictedRoleLabel =
    profile?.role === "creator"
      ? t("unauthorized.roles.brandsAndAgencies")
      : t("unauthorized.roles.authorizedUsers");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="bg-red-100 p-6 rounded-full">
            <ShieldAlert className="w-16 h-16 text-red-600" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {t("unauthorized.title")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("unauthorized.description", { role: restrictedRoleLabel })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("unauthorized.goBack")}
          </Button>
        </div>

        <div className="pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {t("unauthorized.contactSupport")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
