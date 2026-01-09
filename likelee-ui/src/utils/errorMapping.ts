export const getFriendlyErrorMessage = (
  error: any,
  t?: (key: string) => string,
): string => {
  let message =
    error?.message ||
    error?.error_description ||
    (t ? t("organizationSignup.errors.generic") : "An unexpected error occurred.");

  // Try to parse JSON from the message if it looks like a JSON string
  try {
    const jsonMatch = message.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error_code && t) {
        // Try to find a specific translation for the error code
        const translatedError = t(
          `organizationSignup.errors.${parsed.error_code}`,
        );
        // If translation returns the key (i18next behavior when missing), fall back
        if (translatedError && translatedError !== `organizationSignup.errors.${parsed.error_code}`) {
          return translatedError;
        }
      }
      // Use the msg or message from JSON if available
      if (parsed.msg) message = parsed.msg;
      else if (parsed.message) message = parsed.message;
    }
  } catch (e) {
    // Ignore parsing errors
  }

  // Common Auth Errors
  if (message.includes("Invalid login credentials")) {
    return t
      ? t("organizationSignup.errors.invalidCredentials")
      : "Incorrect email or password. Please check your details and try again.";
  }
  if (message.includes("User already registered")) {
    return t
      ? t("organizationSignup.errors.duplicate_email")
      : "An account with this email already exists. Please sign in instead.";
  }
  if (message.includes("Password should be at least")) {
    return t
      ? t("organizationSignup.errors.weakPassword")
      : "Your password is too short. Please use at least 6 characters.";
  }
  if (message.includes("Email not confirmed")) {
    return t
      ? t("organizationSignup.errors.emailNotConfirmed")
      : "Please verify your email address. Check your inbox for a confirmation link.";
  }
  if (message.includes("Rate limit exceeded")) {
    return t
      ? t("organizationSignup.errors.rateLimit")
      : "Too many attempts. Please wait a moment before trying again.";
  }
  if (message.includes("Network request failed")) {
    return t
      ? t("organizationSignup.errors.networkError")
      : "Connection lost. Please check your internet connection.";
  }

  // Handle "User not allowed" specifically if JSON parsing failed but text is present
  if (message.includes("User not allowed")) {
    return t
      ? t("organizationSignup.errors.user_not_allowed")
      : "User not allowed to register this organization.";
  }

  // Fallback for other errors, but cleaned up
  return message;
};
