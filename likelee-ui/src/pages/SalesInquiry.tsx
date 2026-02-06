import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";

export default function SalesInquiry() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    company_size: "",
    budget_range: "",
    use_case: "",
    message: "",
  });

  const submitInquiry = useMutation({
    mutationFn: (data: typeof formData) => {
      // In a real app this would call an API endpoint
      // For now we'll simulate a successful submission logging
      console.log("Sales Inquiry Submitted:", data);

      return base44.post("/api/integrations/core/send-email", {
        to: "admin@likelee.ai",
        subject: `Sales Inquiry from ${data.company_name}`,
        body: `
New Sales Inquiry:

Company: ${data.company_name}
Contact: ${data.contact_name}
Email: ${data.email}
Phone: ${data.phone}
Company Size: ${data.company_size}
Budget Range: ${data.budget_range}
Primary Use Case: ${data.use_case}

Message:
${data.message}
        `,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitInquiry.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-16 px-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("salesInquiry.success.title")}
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {t("salesInquiry.success.message")}
          </p>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 border-2 border-black rounded-none mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {t("salesInquiry.success.whatsNextTitle")}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {t("salesInquiry.success.whatsNextMessage")}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t("salesInquiry.title")}
          </h1>
          <p className="text-lg text-gray-600">{t("salesInquiry.subtitle")}</p>
        </div>

        <Card className="p-8 md:p-10 bg-white border-2 border-black shadow-xl rounded-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t("salesInquiry.contactInfo.companyName")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder={t("salesInquiry.placeholders.companyName")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t("salesInquiry.contactInfo.yourName")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder={t("salesInquiry.placeholders.yourName")}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t("salesInquiry.contactInfo.workEmail")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder={t("salesInquiry.placeholders.workEmail")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t("salesInquiry.contactInfo.phone")}
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder={t("salesInquiry.placeholders.phone")}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t("salesInquiry.contactInfo.companySize")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  required
                  value={formData.company_size}
                  onValueChange={(value) =>
                    setFormData({ ...formData, company_size: value })
                  }
                >
                  <SelectTrigger className="h-12 border-gray-300 rounded-md">
                    <SelectValue
                      placeholder={t("salesInquiry.placeholders.selectSize")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">
                      {t("salesInquiry.options.employees_1_10")}
                    </SelectItem>
                    <SelectItem value="11-50">
                      {t("salesInquiry.options.employees_11_50")}
                    </SelectItem>
                    <SelectItem value="51-200">
                      {t("salesInquiry.options.employees_51_200")}
                    </SelectItem>
                    <SelectItem value="201-500">
                      {t("salesInquiry.options.employees_201_500")}
                    </SelectItem>
                    <SelectItem value="501+">
                      {t("salesInquiry.options.employees_501_plus")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t("salesInquiry.contactInfo.monthlyBudget")}
                </label>
                <Select
                  value={formData.budget_range}
                  onValueChange={(value) =>
                    setFormData({ ...formData, budget_range: value })
                  }
                >
                  <SelectTrigger className="h-12 border-gray-300 rounded-md">
                    <SelectValue
                      placeholder={t("salesInquiry.placeholders.selectRange")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<5k">
                      {t("salesInquiry.options.budget_under_5k")}
                    </SelectItem>
                    <SelectItem value="5k-15k">
                      {t("salesInquiry.options.budget_5k_15k")}
                    </SelectItem>
                    <SelectItem value="15k-50k">
                      {t("salesInquiry.options.budget_15k_50k")}
                    </SelectItem>
                    <SelectItem value="50k-100k">
                      {t("salesInquiry.options.budget_50k_100k")}
                    </SelectItem>
                    <SelectItem value="100k+">
                      {t("salesInquiry.options.budget_100k_plus")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t("salesInquiry.contactInfo.primaryUseCase")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                required
                value={formData.use_case}
                onValueChange={(value) =>
                  setFormData({ ...formData, use_case: value })
                }
              >
                <SelectTrigger className="h-12 border-gray-300 rounded-md">
                  <SelectValue
                    placeholder={t("salesInquiry.placeholders.selectUseCase")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecommerce">
                    {t("salesInquiry.options.useCase_ecommerce")}
                  </SelectItem>
                  <SelectItem value="advertising">
                    {t("salesInquiry.options.useCase_advertising")}
                  </SelectItem>
                  <SelectItem value="social">
                    {t("salesInquiry.options.useCase_social")}
                  </SelectItem>
                  <SelectItem value="video">
                    {t("salesInquiry.options.useCase_video")}
                  </SelectItem>
                  <SelectItem value="other">
                    {t("salesInquiry.options.useCase_other")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t("salesInquiry.contactInfo.tellUsMore")}
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="min-h-[120px] border-gray-300 rounded-md resize-none"
                placeholder={t("salesInquiry.placeholders.message")}
              />
            </div>

            <Button
              type="submit"
              disabled={submitInquiry.isPending}
              className="w-full h-12 text-lg font-medium bg-[#F7B750] hover:bg-[#FAD54C] text-gray-900 rounded-md transition-all"
            >
              {submitInquiry.isPending
                ? t("salesInquiry.submitting")
                : t("salesInquiry.submit")}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          {t("salesInquiry.assistance")}{" "}
          <a
            href="mailto:operations@likelee.ai"
            className="text-[#F7B750] hover:text-[#FAD54C] font-medium"
          >
            operations@likelee.ai
          </a>
        </p>
      </div>
    </div>
  );
}
