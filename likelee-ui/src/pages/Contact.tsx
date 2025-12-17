import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    contact_name: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subject = `Contact Form Submission from ${formData.contact_name}`;
    const body = `New Contact Form Submission:\n\nName: ${formData.contact_name}\nEmail: ${formData.email}\nPhone: ${formData.phone}`;
    const mailto = `mailto:admin@likelee.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white py-16 px-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
          <div className="w-20 h-20 bg-[#32C8D1] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("thankYou")}
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {t("thankYouMessage")}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-20 px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t("seeLikeleeInAction")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("seeLikeleeInActionMessage")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="h-12 border-gray-300 rounded-md"
              placeholder={t("businessEmail")}
            />
          </div>
          <div>
            <Input
              id="contact_name"
              required
              value={formData.contact_name}
              onChange={(e) =>
                setFormData({ ...formData, contact_name: e.target.value })
              }
              className="h-12 border-gray-300 rounded-md"
              placeholder={t("fullName")}
            />
          </div>
          <div>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="h-12 border-gray-300 rounded-md"
              placeholder={t("phone")}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
          >
            {t("continue")}
          </Button>
        </form>
      </div>
    </div>
  );
}
