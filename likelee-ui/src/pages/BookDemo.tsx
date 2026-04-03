import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarCheck2, Clock3, Mail, Users } from "lucide-react";

import { getCalendlyBookingUrl } from "@/api/functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/config/public";
import {
  buildCalendlyBookingUrl,
  createBookDemoThankYouUrl,
  saveDemoBookingContext,
} from "@/utils/bookDemo";

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
      return buildCalendlyBookingUrl(
        bookingUrl,
        source,
        formData,
        createBookDemoThankYouUrl(source),
      );
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
  const trustItems = [
    {
      icon: CalendarCheck2,
      title: t("bookDemoPage.autoInvitesTitle"),
      description: t("bookDemoPage.autoInvitesDescription"),
      accent: "bg-[#26B7B9]/15 text-[#117E80]",
    },
    {
      icon: Users,
      title: t("bookDemoPage.expertWalkthroughTitle"),
      description: t("bookDemoPage.expertWalkthroughDescription"),
      accent: "bg-[#F7B750]/18 text-[#9A6400]",
    },
    {
      icon: Clock3,
      title: t("bookDemoPage.fastFollowUpTitle"),
      description: t("bookDemoPage.fastFollowUpDescription"),
      accent: "bg-[#0D1B3A]/10 text-[#0D1B3A]",
    },
  ];
  const processSteps = [
    {
      step: "01",
      title: t("bookDemoPage.stepOneTitle"),
      description: t("bookDemoPage.stepOneDescription"),
    },
    {
      step: "02",
      title: t("bookDemoPage.stepTwoTitle"),
      description: t("bookDemoPage.stepTwoDescription"),
    },
  ];
  const statusHeading = errorMessage
    ? t("bookDemoPage.embedErrorTitle")
    : loading
      ? t("bookDemoPage.loadingTitle")
      : t("bookDemoPage.statusTitle");
  const statusCopy = errorMessage
    ? errorMessage
    : loading
      ? t("bookDemoPage.loading")
      : t("bookDemoPage.statusDescription");
  const canSubmit =
    !!calendlyUrl &&
    isFormComplete &&
    !loading &&
    !errorMessage &&
    !isRedirecting;

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
          const errorData = (error as any)?.data;
          const errorCode =
            errorData?.error ||
            errorData?.code ||
            errorData?.error_code ||
            errorData?.status;
          const isNotConfigured =
            String(errorCode).trim().toLowerCase() === "not_configured" ||
            String((error as any)?.message || "")
              .toLowerCase()
              .includes("not configured");
          const message = isNotConfigured
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
      saveDemoBookingContext({
        source,
        inviteeEmail: formData.workEmail,
        inviteeFullName: formData.userName,
        inviteeFirstName: formData.userName?.split(" ")[0],
        inviteeLastName: formData.userName?.split(" ").slice(1).join(" "),
        answer1: formData.companyName,
        answer2: formData.phoneNumber,
        scheduledAt: new Date().toISOString(),
      });
      window.location.assign(calendlyUrl);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [calendlyUrl, errorMessage, formData, isRedirecting, source]);

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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#F8FCFF_0%,#EEF8FB_48%,#FFF5EA_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(38,183,185,0.16),_transparent_52%)]" />
      <div className="pointer-events-none absolute -left-24 top-52 h-72 w-72 rounded-full bg-[#26B7B9]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[#F7B750]/14 blur-3xl" />

      <div className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div className="mx-auto max-w-3xl space-y-5 text-center">
          <div className="inline-flex items-center rounded-full border border-[#26B7B9]/25 bg-white/80 px-4 py-2 text-sm font-semibold text-[#1B7E80] shadow-sm">
            {t("bookDemoPage.kicker")}
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-6xl">
              {t("bookDemoPage.title")}
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-700 md:text-xl">
              {t("bookDemoPage.description")}
            </p>
          </div>
        </div>

        <Card className="mt-10 overflow-hidden rounded-[32px] border border-black/10 bg-white/90 shadow-[0_32px_90px_rgba(13,27,58,0.14)] backdrop-blur">
          <div className="grid lg:grid-cols-[320px_1fr]">
            <div className="relative overflow-hidden bg-[#0D1B3A] px-6 py-8 text-white md:px-8 md:py-10">
              <div className="pointer-events-none absolute -right-10 top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[#26B7B9]/20 blur-3xl" />

              <div className="relative space-y-6">
                <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {t("bookDemoPage.processBadge")}
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-bold leading-tight">
                    {t("bookDemoPage.processTitle")}
                  </h2>
                  <p className="text-sm leading-6 text-slate-200">
                    {t("bookDemoPage.processDescription")}
                  </p>
                </div>

                <div className="space-y-3">
                  {processSteps.map((item) => (
                    <div
                      key={item.step}
                      className="rounded-[22px] border border-white/10 bg-white/[0.08] p-4 backdrop-blur"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-[#0D1B3A]">
                          {item.step}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-white">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-6 text-slate-200">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 text-sm font-medium leading-6 text-slate-100">
                  {t("bookDemoPage.reassurance")}
                </div>
              </div>
            </div>

            <form className="p-6 md:p-8 lg:p-10" onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex items-center rounded-full bg-[#0D1B3A] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                    {t("bookDemoPage.statusBadge")}
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                      {statusHeading}
                    </h2>
                    <p className="max-w-2xl text-base leading-7 text-gray-600">
                      {statusCopy}
                    </p>
                  </div>
                </div>

                {!errorMessage && !loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
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
                        className="h-14 rounded-2xl border border-black/10 bg-[#F8FAFC] px-4 text-base placeholder:text-gray-400 focus-visible:border-[#26B7B9] focus-visible:ring-[#26B7B9]/30"
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
                        className="h-14 rounded-2xl border border-black/10 bg-[#F8FAFC] px-4 text-base placeholder:text-gray-400 focus-visible:border-[#26B7B9] focus-visible:ring-[#26B7B9]/30"
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
                        className="h-14 rounded-2xl border border-black/10 bg-[#F8FAFC] px-4 text-base placeholder:text-gray-400 focus-visible:border-[#26B7B9] focus-visible:ring-[#26B7B9]/30"
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
                        className="h-14 rounded-2xl border border-black/10 bg-[#F8FAFC] px-4 text-base placeholder:text-gray-400 focus-visible:border-[#26B7B9] focus-visible:ring-[#26B7B9]/30"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-[24px] border p-5 ${
                      errorMessage
                        ? "border-[#F7B750]/50 bg-[#FFF8EF]"
                        : "border-black/10 bg-[#F8FAFC]"
                    }`}
                  >
                    <p className="text-sm leading-6 text-gray-700">
                      {statusCopy}
                    </p>
                  </div>
                )}

                <div className="space-y-4 border-t border-black/10 pt-6">
                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="h-14 w-full rounded-2xl border border-[#0D1B3A] bg-[#0D1B3A] text-base font-semibold text-white shadow-[0_16px_32px_rgba(13,27,58,0.18)] hover:bg-[#15274B] disabled:border-slate-300 disabled:bg-slate-400 disabled:shadow-none"
                  >
                    {isRedirecting
                      ? t("bookDemoPage.redirecting")
                      : t("bookDemoPage.openInNewTab")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <p className="text-sm font-medium leading-6 text-gray-500">
                    {t("bookDemoPage.reassurance")}
                  </p>

                  <div className="flex items-start gap-3 rounded-[22px] border border-black/10 bg-[#F8FBFB] px-4 py-3 text-sm leading-6 text-gray-700">
                    <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1B7E80]" />
                    <p>
                      {t("bookDemoPage.helpBooking")}{" "}
                      <a
                        href={CONTACT_EMAIL_MAILTO}
                        className="font-semibold text-[#1B7E80] hover:text-[#145f61]"
                      >
                        {CONTACT_EMAIL}
                      </a>
                    </p>
                  </div>

                  <p className="text-sm text-gray-500">
                    {t("bookDemoPage.calendarTip")}
                  </p>
                </div>
              </div>
            </form>
          </div>
        </Card>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.title}
                className="rounded-[24px] border border-black/10 bg-white/70 p-5 shadow-[0_10px_30px_rgba(13,27,58,0.05)] backdrop-blur"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${item.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-gray-900">
                      {item.title}
                    </h2>
                    <p className="text-sm leading-6 text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
