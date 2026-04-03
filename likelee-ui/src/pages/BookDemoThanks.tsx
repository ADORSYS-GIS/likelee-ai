import React, { useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Mail, MoveRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/config/public";
import {
  DemoBookingContext,
  extractDemoBookingContext,
  readDemoBookingContextFromSearch,
  readStoredDemoBookingContext,
} from "@/utils/bookDemo";

function formatEventDate(dateValue?: string) {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function mergeBookingContext(
  searchContext: DemoBookingContext | null,
  stateContext: DemoBookingContext | null,
  storedContext: DemoBookingContext | null,
  payloadContext: DemoBookingContext | null,
) {
  return {
    ...(storedContext || {}),
    ...(stateContext || {}),
    ...(payloadContext || {}),
    ...(searchContext || {}),
  };
}

export default function BookDemoThanks() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const bookingContext = useMemo(() => {
    const searchContext = readDemoBookingContextFromSearch(searchParams);
    const payloadContext =
      location.state &&
      typeof location.state === "object" &&
      "calendlyPayload" in location.state
        ? extractDemoBookingContext(
            searchParams.get("source")?.trim() || undefined,
            (location.state as any).calendlyPayload,
          )
        : null;
    const stateContext =
      location.state &&
      typeof location.state === "object" &&
      "bookingContext" in location.state
        ? (location.state.bookingContext as DemoBookingContext)
        : null;
    const storedContext = readStoredDemoBookingContext();

    return mergeBookingContext(
      searchContext,
      stateContext,
      storedContext,
      payloadContext,
    );
  }, [location.state, searchParams]);

  const formattedStartTime = formatEventDate(bookingContext.eventStartTime);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7FCFF_0%,#EDF7FA_42%,#FFF4E8_100%)] px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <Card className="rounded-none border-2 border-black bg-white p-10 text-center shadow-[14px_14px_0_rgba(0,0,0,0.08)]">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-[#26B7B9] text-white">
            <CalendarDays className="h-10 w-10" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            {t("bookDemoThanksPage.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-700">
            {t("bookDemoThanksPage.description")}
          </p>

          <div className="mt-10 grid gap-4 text-left md:grid-cols-3">
            <Card className="rounded-none border border-black/15 bg-[#F8FBFB] p-5 shadow-none">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-500">
                {t("bookDemoThanksPage.eventTypeLabel")}
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {bookingContext.eventTypeName ||
                  t("bookDemoThanksPage.defaultEventName")}
              </p>
            </Card>

            <Card className="rounded-none border border-black/15 bg-[#FFF8EF] p-5 shadow-none">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-500">
                {t("bookDemoThanksPage.dateLabel")}
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {formattedStartTime || t("bookDemoThanksPage.defaultDateValue")}
              </p>
            </Card>

            <Card className="rounded-none border border-black/15 bg-[#F5F7FB] p-5 shadow-none">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-500">
                {t("bookDemoThanksPage.emailLabel")}
              </p>
              <p className="mt-2 break-all text-lg font-semibold text-gray-900">
                {bookingContext.inviteeEmail ||
                  t("bookDemoThanksPage.defaultEmailValue")}
              </p>
            </Card>
          </div>
        </Card>

        <Card className="rounded-none border-2 border-black bg-white p-8 shadow-[14px_14px_0_rgba(0,0,0,0.08)]">
          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-start">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("bookDemoThanksPage.nextTitle")}
              </h2>
              <p className="text-base leading-relaxed text-gray-700">
                {t("bookDemoThanksPage.nextBody")}
              </p>
            </div>

            <div className="space-y-4 rounded-none border border-black/10 bg-[#F7FBFA] p-5">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-[#1B7E80]" />
                <p className="text-sm leading-relaxed text-gray-700">
                  {t("bookDemoThanksPage.contact")}{" "}
                  <a
                    href={CONTACT_EMAIL_MAILTO}
                    className="font-semibold text-[#1B7E80] hover:text-[#145f61]"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>

              <Button
                asChild
                className="h-12 w-full rounded-none border-2 border-black bg-[#0D1B3A] text-white hover:bg-[#12244d]"
              >
                <a href="/" rel="noreferrer">
                  {t("bookDemoThanksPage.backHome")}
                  <MoveRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
