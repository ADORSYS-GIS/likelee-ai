import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";

export type EmailOtpPurpose = "signup" | "signin";

const VERIFY_TYPE_FALLBACKS: Record<EmailOtpPurpose, EmailOtpType[]> = {
  signup: ["email", "signup"],
  signin: ["email", "magiclink"],
};

export function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export async function verifyEmailOtpCode(
  client: SupabaseClient,
  params: {
    email: string;
    token: string;
    purpose: EmailOtpPurpose;
  },
) {
  const email = normalizeEmail(params.email);
  const token = String(params.token || "").trim();
  let lastError: Error | null = null;

  for (const type of VERIFY_TYPE_FALLBACKS[params.purpose]) {
    const { data, error } = await client.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (!error) {
      return data;
    }

    lastError = error;
  }

  throw lastError || new Error("Unable to verify code");
}

export async function sendExistingUserEmailOtp(
  client: SupabaseClient,
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) throw error;
}

export async function resendSignupEmailOtp(
  client: SupabaseClient,
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const { error } = await client.auth.resend({
    type: "signup",
    email: normalizedEmail,
  });

  if (error) throw error;
}
