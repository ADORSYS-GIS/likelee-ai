import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, Send } from "lucide-react";
import { CONTACT_EMAIL } from "@/config/public";
import { toast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

export default function Support() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    try {
      setSending(true);
      await base44.post("/integrations/core/send-email", {
        to: CONTACT_EMAIL,
        subject: `Support: ${formData.subject}`,
        body: `From: ${formData.email}\n\n${formData.message}`,
      });

      setSubmitted(true);
      setTimeout(() => {
        setFormData({ email: "", subject: "", message: "" });
        setSubmitted(false);
      }, 3000);
    } catch (e) {
      toast({
        title: "Failed to send",
        description:
          e instanceof Error
            ? e.message
            : "Something went wrong sending your message.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t("supportPage.hero.title")}
          </h1>
          <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto mb-4">
            {t("supportPage.hero.subtitle")}{" "}
            <button
              onClick={() => {
                navigator.clipboard.writeText(CONTACT_EMAIL);
                toast({
                  title: t("supportPage.footer.copied"),
                  description: t("supportPage.footer.copiedDescription"),
                });
              }}
              className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
            >
              {CONTACT_EMAIL}
            </button>
            .
          </p>
          <p className="text-lg text-gray-600">
            {t("supportPage.hero.description")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <p className="text-center text-sm text-gray-600 mb-6">
            {t("supportPage.footer.orEmail")}{" "}
            <button
              onClick={() => {
                navigator.clipboard.writeText(CONTACT_EMAIL);
                toast({
                  title: t("supportPage.footer.copied"),
                  description: t("supportPage.footer.copiedDescription"),
                });
              }}
              className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
            >
              {CONTACT_EMAIL}
            </button>
          </p>
        </div>

        <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-none">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t("supportPage.success.title")}
              </h3>
              <p className="text-gray-600">
                {t("supportPage.success.description")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  {t("supportPage.form.emailLabel")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder={t("supportPage.form.emailPlaceholder")}
                />
              </div>

              <div>
                <Label
                  htmlFor="subject"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  {t("supportPage.form.subjectLabel")}
                </Label>
                <Input
                  id="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder={t("supportPage.form.subjectPlaceholder")}
                />
              </div>

              <div>
                <Label
                  htmlFor="message"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  {t("supportPage.form.messageLabel")}
                </Label>
                <Textarea
                  id="message"
                  required
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none min-h-[200px]"
                  placeholder={t("supportPage.form.messagePlaceholder")}
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
              >
                {sending
                  ? t("supportPage.form.sending")
                  : t("supportPage.form.sendButton")}
              </Button>
            </form>
          )}
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            {t("supportPage.footer.orEmail")}{" "}
            <button
              onClick={() => {
                navigator.clipboard.writeText(CONTACT_EMAIL);
                toast({
                  title: t("supportPage.footer.copied"),
                  description: t("supportPage.footer.copiedDescription"),
                });
              }}
              className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
            >
              {CONTACT_EMAIL}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
