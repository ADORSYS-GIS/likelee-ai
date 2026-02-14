const contactEmailFromEnv = import.meta.env.VITE_CONTACT_EMAIL?.trim();

export const CONTACT_EMAIL =
  contactEmailFromEnv && contactEmailFromEnv.length > 0
    ? contactEmailFromEnv
    : "operations@likelee.ai";

export const CONTACT_EMAIL_MAILTO = `mailto:${CONTACT_EMAIL}`;
