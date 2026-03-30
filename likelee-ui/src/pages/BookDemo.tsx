import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarCheck2, Clock3, Mail, Users } from "lucide-react";

import { getCalendlyBookingUrl } from "@/api/functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/config/public";
import { buildCalendlyBookingUrl } from "@/utils/bookDemo";

export default function BookDemo() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source")?.trim() || undefined;
  const [bookingUrl, setBookingUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    userName: "",
    workEmail: "",
    phoneNumber: "",
  });

  const calendlyUrl = useMemo(() => {
    if (!bookingUrl) return "";

    try {
      return buildCalendlyBookingUrl(bookingUrl, source, formData);
    } catch {
      return "";
    }
  }, [bookingUrl, source, formData]);

  const isFormComplete = useMemo(
    () =>
      Object.values(formData).every(
        (value) => typeof value === "string" && value.trim().length > 0,
      ),
    [formData],
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchBookingUrl() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await getCalendlyBookingUrl();
        const url = response?.data?.booking_url?.trim();

        if (!url) {
          if (!cancelled) {
            setErrorMessage(t("bookDemoPage.notConfigured"));
          }
          return;
        }

        if (!cancelled) {
          setBookingUrl(url);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error &&
            error.message === t("bookDemoPage.notConfigured")
              ? t("bookDemoPage.notConfigured")
              : t("bookDemoPage.embedErrorDescription");
          setErrorMessage(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBookingUrl();

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!isRedirecting || !calendlyUrl || errorMessage) return;

    const timeout = window.setTimeout(() => {
      window.location.assign(calendlyUrl);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [calendlyUrl, errorMessage, isRedirecting]);

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!calendlyUrl || !isFormComplete || loading || errorMessage) return;
    setIsRedirecting(true);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7FCFF_0%,#EDF7FA_42%,#FFF4E8_100%)] px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-stretch">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-[#26B7B9]/30 bg-white/80 px-4 py-2 text-sm font-semibold text-[#1B7E80] shadow-sm">
              {t("bookDemoPage.kicker")}
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                {t("bookDemoPage.title")}
              </h1>
              <p className="max-w-3xl text-lg leading-relaxed text-gray-700">
                {t("bookDemoPage.description")}
              </p>
            </div>

            <div className="grid gap-4">
              <Card className="rounded-none border-2 border-black bg-white/90 p-5 shadow-[8px_8px_0_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center border-2 border-black bg-[#26B7B9] text-white">
                    <CalendarCheck2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">
                      {t("bookDemoPage.autoInvitesTitle")}
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {t("bookDemoPage.autoInvitesDescription")}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-none border-2 border-black bg-white/90 p-5 shadow-[8px_8px_0_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center border-2 border-black bg-[#F7B750] text-gray-900">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">
                      {t("bookDemoPage.expertWalkthroughTitle")}
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {t("bookDemoPage.expertWalkthroughDescription")}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-none border-2 border-black bg-white/90 p-5 shadow-[8px_8px_0_rgba(0,0,0,0.08)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center border-2 border-black bg-[#0D1B3A] text-white">
                    <Clock3 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">
                      {t("bookDemoPage.fastFollowUpTitle")}
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {t("bookDemoPage.fastFollowUpDescription")}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Card className="rounded-none border-2 border-black bg-white p-8 shadow-[14px_14px_0_rgba(0,0,0,0.08)] lg:sticky lg:top-24">
            <form
              className="flex h-full flex-col justify-between gap-8"
              onSubmit={handleSubmit}
            >
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full bg-[#0D1B3A] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                  {t("bookDemoPage.statusBadge")}
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {errorMessage
                      ? t("bookDemoPage.embedErrorTitle")
                      : loading
                        ? t("bookDemoPage.loadingTitle")
                        : t("bookDemoPage.statusTitle")}
                  </h2>
                  <p className="text-base leading-relaxed text-gray-700">
                    {errorMessage
                      ? errorMessage
                      : loading
                        ? t("bookDemoPage.loading")
                        : t("bookDemoPage.statusDescription")}
                  </p>
                </div>

                {!errorMessage && !loading ? (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">
                        {t("bookDemoPage.companyNameLabel")}
                      </label>
                      <Input
                        name="companyName"
                        autoComplete="organization"
                        required
                        value={formData.companyName}
                        onChange={(event) =>
                          updateField("companyName", event.target.value)
                        }
                        placeholder={t("bookDemoPage.companyNamePlaceholder")}
                        className="h-12 rounded-none border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">
                        {t("bookDemoPage.userNameLabel")}
                      </label>
                      <Input
                        name="userName"
                        autoComplete="name"
                        required
                        value={formData.userName}
                        onChange={(event) =>
                          updateField("userName", event.target.value)
                        }
                        placeholder={t("bookDemoPage.userNamePlaceholder")}
                        className="h-12 rounded-none border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">
                        {t("bookDemoPage.workEmailLabel")}
                      </label>
                      <Input
                        name="workEmail"
                        autoComplete="email"
                        type="email"
                        required
                        value={formData.workEmail}
                        onChange={(event) =>
                          updateField("workEmail", event.target.value)
                        }
                        placeholder={t("bookDemoPage.workEmailPlaceholder")}
                        className="h-12 rounded-none border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">
                        {t("bookDemoPage.phoneNumberLabel")}
                      </label>
                      <Input
                        name="phoneNumber"
                        autoComplete="tel"
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(event) =>
                          updateField("phoneNumber", event.target.value)
                        }
                        placeholder={t("bookDemoPage.phoneNumberPlaceholder")}
                        className="h-12 rounded-none border-gray-300"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={
                    !calendlyUrl ||
                    !isFormComplete ||
                    loading ||
                    !!errorMessage ||
                    isRedirecting
                  }
                  className="h-12 w-full rounded-none border-2 border-black bg-[#0D1B3A] text-white hover:bg-[#12244d]"
                >
                  {isRedirecting
                    ? t("bookDemoPage.redirecting")
                    : t("bookDemoPage.openInNewTab")}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-none border-2 border-black bg-white text-gray-900 hover:bg-gray-50"
                >
                  <a href={CONTACT_EMAIL_MAILTO}>
                    {t("bookDemoPage.emailButton")}
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>

                <p className="text-sm leading-relaxed text-gray-600">
                  {t("bookDemoPage.contactFallback")}{" "}
                  <a
                    href={CONTACT_EMAIL_MAILTO}
                    className="font-semibold text-[#1B7E80] hover:text-[#145f61]"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>

                <p className="text-sm font-medium text-gray-600">
                  {t("bookDemoPage.calendarTip")}
                </p>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
