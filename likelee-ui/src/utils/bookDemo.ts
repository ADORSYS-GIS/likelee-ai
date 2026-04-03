export const BOOK_DEMO_PATH = "/book-demo";
export const BOOK_DEMO_THANK_YOU_PATH = "/book-demo/thanks";
export const BOOK_DEMO_STORAGE_KEY = "likelee.book_demo.last_booking";

export type DemoBookingContext = {
  source?: string;
  eventTypeName?: string;
  eventTypeUuid?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  inviteeUuid?: string;
  inviteeEmail?: string;
  inviteeFullName?: string;
  inviteeFirstName?: string;
  inviteeLastName?: string;
  inviteeTimezone?: string;
  guests?: string;
  assignedTo?: string;
  answer1?: string;
  answer2?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  scheduledAt?: string;
  eventUri?: string;
  inviteeUri?: string;
};

export type DemoBookingLeadInput = {
  companyName?: string;
  userName?: string;
  workEmail?: string;
  phoneNumber?: string;
};

export function createBookDemoUrl(source?: string): string {
  if (!source) return BOOK_DEMO_PATH;

  const params = new URLSearchParams({ source });
  return `${BOOK_DEMO_PATH}?${params.toString()}`;
}

export function createBookDemoThankYouUrl(source?: string): string {
  if (!source) return BOOK_DEMO_THANK_YOU_PATH;

  const params = new URLSearchParams({ source });
  return `${BOOK_DEMO_THANK_YOU_PATH}?${params.toString()}`;
}

export function buildCalendlyBookingUrl(
  baseBookingUrl: string,
  source?: string,
  leadInput?: DemoBookingLeadInput,
  thankYouUrl?: string,
): string {
  const url = new URL(baseBookingUrl);

  url.searchParams.set("utm_source", "likelee");
  url.searchParams.set("utm_medium", "website");
  url.searchParams.set("utm_campaign", "book_demo_cta");

  if (source) {
    url.searchParams.set("utm_content", source);
  }

  if (leadInput?.userName) {
    url.searchParams.set("name", leadInput.userName);
  }

  if (leadInput?.workEmail) {
    url.searchParams.set("email", leadInput.workEmail);
  }

  // Company name and phone number are forwarded as the first two custom
  // answers so they prefill when the Calendly event is configured with
  // matching invitee questions in that order.
  if (leadInput?.companyName) {
    url.searchParams.set("a1", leadInput.companyName);
  }

  if (leadInput?.phoneNumber) {
    url.searchParams.set("a2", leadInput.phoneNumber);
  }

  if (thankYouUrl) {
    url.searchParams.set("redirect_url", thankYouUrl);
  }

  return url.toString();
}

export function extractDemoBookingContext(
  source: string | undefined,
  payload: any,
): DemoBookingContext {
  const eventData =
    payload?.event && typeof payload.event === "object" ? payload.event : {};
  const inviteeData =
    payload?.invitee && typeof payload.invitee === "object"
      ? payload.invitee
      : {};

  const derivedName =
    typeof inviteeData.name === "string" && inviteeData.name.trim().length > 0
      ? inviteeData.name.trim()
      : [inviteeData.first_name, inviteeData.last_name]
          .filter(
            (value) => typeof value === "string" && value.trim().length > 0,
          )
          .join(" ");

  return {
    source,
    eventTypeName:
      typeof eventData.name === "string" ? eventData.name : undefined,
    eventTypeUuid:
      typeof eventData.uuid === "string" ? eventData.uuid : undefined,
    eventStartTime:
      typeof eventData.start_time === "string"
        ? eventData.start_time
        : undefined,
    eventEndTime:
      typeof eventData.end_time === "string" ? eventData.end_time : undefined,
    inviteeUuid:
      typeof inviteeData.uuid === "string" ? inviteeData.uuid : undefined,
    inviteeEmail:
      typeof inviteeData.email === "string" ? inviteeData.email : undefined,
    inviteeFullName: derivedName || undefined,
    inviteeFirstName:
      typeof inviteeData.first_name === "string"
        ? inviteeData.first_name
        : undefined,
    inviteeLastName:
      typeof inviteeData.last_name === "string"
        ? inviteeData.last_name
        : undefined,
    inviteeTimezone:
      typeof inviteeData.timezone === "string"
        ? inviteeData.timezone
        : undefined,
    scheduledAt: new Date().toISOString(),
    eventUri: typeof eventData.uri === "string" ? eventData.uri : undefined,
    inviteeUri:
      typeof inviteeData.uri === "string" ? inviteeData.uri : undefined,
  };
}

export function readDemoBookingContextFromSearch(
  searchParams: URLSearchParams,
): DemoBookingContext | null {
  const hasCalendlyData =
    searchParams.get("invitee_uuid") ||
    searchParams.get("invitee_email") ||
    searchParams.get("invitee_full_name") ||
    searchParams.get("event_type_name") ||
    searchParams.get("event_start_time");

  if (!hasCalendlyData && !searchParams.get("source")) {
    return null;
  }

  return {
    source: searchParams.get("source") || undefined,
    eventTypeName: searchParams.get("event_type_name") || undefined,
    eventTypeUuid: searchParams.get("event_type_uuid") || undefined,
    eventStartTime: searchParams.get("event_start_time") || undefined,
    eventEndTime: searchParams.get("event_end_time") || undefined,
    inviteeUuid: searchParams.get("invitee_uuid") || undefined,
    inviteeEmail: searchParams.get("invitee_email") || undefined,
    inviteeFullName: searchParams.get("invitee_full_name") || undefined,
    inviteeFirstName: searchParams.get("invitee_first_name") || undefined,
    inviteeLastName: searchParams.get("invitee_last_name") || undefined,
    guests: searchParams.get("guests") || undefined,
    assignedTo: searchParams.get("assigned_to") || undefined,
    answer1: searchParams.get("answer_1") || undefined,
    answer2: searchParams.get("answer_2") || undefined,
    utmSource: searchParams.get("utm_source") || undefined,
    utmMedium: searchParams.get("utm_medium") || undefined,
    utmCampaign: searchParams.get("utm_campaign") || undefined,
    utmContent: searchParams.get("utm_content") || undefined,
  };
}

export function saveDemoBookingContext(context: DemoBookingContext) {
  try {
    window.sessionStorage.setItem(
      BOOK_DEMO_STORAGE_KEY,
      JSON.stringify(context),
    );
  } catch {
    // Ignore storage failures so the booking flow never blocks.
  }
}

export function readStoredDemoBookingContext(): DemoBookingContext | null {
  try {
    const raw = window.sessionStorage.getItem(BOOK_DEMO_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
