const contactEmailFromEnv = import.meta.env.VITE_CONTACT_EMAIL?.trim();
const salesEmailFromEnv = import.meta.env.VITE_SALES_EMAIL?.trim();
const brandTrialDaysFromEnv = import.meta.env.VITE_BRAND_TRIAL_DAYS?.trim();

export const CONTACT_EMAIL =
  contactEmailFromEnv && contactEmailFromEnv.length > 0
    ? contactEmailFromEnv
    : "operations@likelee.ai";

export const SALES_EMAIL =
  salesEmailFromEnv && salesEmailFromEnv.length > 0
    ? salesEmailFromEnv
    : CONTACT_EMAIL;

export const BRAND_TRIAL_DAYS = (() => {
  const parsed =
    brandTrialDaysFromEnv && brandTrialDaysFromEnv.length > 0
      ? parseInt(brandTrialDaysFromEnv, 10)
      : NaN;
  return !isNaN(parsed) && parsed > 0 && parsed <= 365 ? parsed : 14;
})();

export const CONTACT_EMAIL_MAILTO = `mailto:${CONTACT_EMAIL}`;
export const SALES_EMAIL_MAILTO = `mailto:${SALES_EMAIL}`;
