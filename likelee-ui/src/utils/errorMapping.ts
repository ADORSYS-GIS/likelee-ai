export const getFriendlyErrorMessage = (error: any): string => {
  const message =
    error?.message ||
    error?.error_description ||
    "An unexpected error occurred.";

  // Common Auth Errors
  if (message.includes("Invalid login credentials")) {
    return "Incorrect email or password. Please check your details and try again.";
  }
  if (message.includes("User already registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (message.includes("Password should be at least")) {
    return "Your password is too short. Please use at least 6 characters.";
  }
  if (message.includes("Email not confirmed")) {
    return "Please verify your email address. Check your inbox for a confirmation link.";
  }
  if (message.includes("Rate limit exceeded")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (message.includes("Network request failed")) {
    return "Connection lost. Please check your internet connection.";
  }

  // Fallback for other errors, but cleaned up
  return message;
};
