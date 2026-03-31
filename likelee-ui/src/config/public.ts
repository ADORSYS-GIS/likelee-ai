const contactEmailFromEnv = import.meta.env.VITE_CONTACT_EMAIL?.trim();
const salesEmailFromEnv = import.meta.env.VITE_SALES_EMAIL?.trim();

export const CONTACT_EMAIL =
  contactEmailFromEnv && contactEmailFromEnv.length > 0
    ? contactEmailFromEnv
    : "operations@likelee.ai";

export const SALES_EMAIL =
  salesEmailFromEnv && salesEmailFromEnv.length > 0
    ? salesEmailFromEnv
    : CONTACT_EMAIL;

export const CONTACT_EMAIL_MAILTO = `mailto:${CONTACT_EMAIL}`;
export const SALES_EMAIL_MAILTO = `mailto:${SALES_EMAIL}`;
